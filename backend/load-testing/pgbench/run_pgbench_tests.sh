#!/bin/bash

# pgbench Load Testing Script for LEARN-X
# Runs comprehensive database load tests

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-learnx}"
DB_USER="${DB_USER:-postgres}"
RESULTS_DIR="./results/pgbench/$(date +%Y%m%d_%H%M%S)"

# Test configurations
CLIENTS=(1 5 10 25 50 100)
THREADS=4
DURATION=60  # seconds
RATE_LIMIT=0  # 0 = no limit

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "🚀 Starting pgbench load tests..."
echo "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Function to run a single test
run_test() {
    local test_name=$1
    local script_file=$2
    local clients=$3
    
    echo "Running test: $test_name with $clients clients..."
    
    pgbench \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "$clients" \
        -j "$THREADS" \
        -T "$DURATION" \
        -f "$script_file" \
        -P 10 \
        --log \
        --log-prefix="$RESULTS_DIR/${test_name}_c${clients}_" \
        > "$RESULTS_DIR/${test_name}_c${clients}_summary.txt" 2>&1
    
    echo "✓ Completed $test_name with $clients clients"
}

# Test 1: Vector Search Performance
echo "📊 Test 1: Vector Search Performance"
for c in "${CLIENTS[@]}"; do
    run_test "vector_search" "./01_vector_search.sql" "$c"
done

# Test 2: Dashboard Queries
echo "📊 Test 2: Dashboard Query Performance"
for c in "${CLIENTS[@]}"; do
    run_test "dashboard" "./02_dashboard_queries.sql" "$c"
done

# Test 3: File Operations
echo "📊 Test 3: File Operation Performance"
for c in "${CLIENTS[@]}"; do
    run_test "file_ops" "./03_file_operations.sql" "$c"
done

# Test 4: Concurrent Users
echo "📊 Test 4: Concurrent User Simulation"
for c in "${CLIENTS[@]}"; do
    run_test "concurrent_users" "./04_concurrent_users.sql" "$c"
done

# Test 5: Hybrid Search Performance
echo "📊 Test 5: Hybrid Search Performance"
for c in "${CLIENTS[@]}"; do
    run_test "hybrid_search" "./05_hybrid_search_performance.sql" "$c"
done

# Test 6: Index Performance
echo "📊 Test 6: Index Performance Testing"
for c in "${CLIENTS[@]}"; do
    run_test "index_performance" "./06_index_performance.sql" "$c"
done

# Test 7: Mixed Workload
echo "📊 Test 7: Mixed Workload (All Queries)"
cat 01_vector_search.sql 02_dashboard_queries.sql 03_file_operations.sql > mixed_workload.sql
for c in "${CLIENTS[@]}"; do
    run_test "mixed_workload" "./mixed_workload.sql" "$c"
done
rm mixed_workload.sql

# Generate summary report
echo ""
echo "📈 Generating summary report..."

cat > "$RESULTS_DIR/summary_report.md" << EOF
# pgbench Load Test Results
Generated: $(date)

## Test Configuration
- Database: $DB_HOST:$DB_PORT/$DB_NAME
- Test Duration: ${DURATION}s per test
- Thread Count: $THREADS
- Client Counts: ${CLIENTS[@]}

## Results Summary

### Vector Search Performance
EOF

for c in "${CLIENTS[@]}"; do
    echo "#### $c Clients" >> "$RESULTS_DIR/summary_report.md"
    echo '```' >> "$RESULTS_DIR/summary_report.md"
    tail -n 20 "$RESULTS_DIR/vector_search_c${c}_summary.txt" | grep -E "(tps|latency|stddev)" >> "$RESULTS_DIR/summary_report.md"
    echo '```' >> "$RESULTS_DIR/summary_report.md"
done

# Parse and create CSV for analysis
echo "client_count,test_name,tps,avg_latency_ms,stddev_latency_ms" > "$RESULTS_DIR/results.csv"

for test in "vector_search" "dashboard" "file_ops" "concurrent_users" "hybrid_search" "index_performance" "mixed_workload"; do
    for c in "${CLIENTS[@]}"; do
        if [ -f "$RESULTS_DIR/${test}_c${c}_summary.txt" ]; then
            tps=$(grep "excluding connections establishing" "$RESULTS_DIR/${test}_c${c}_summary.txt" | awk '{print $3}')
            avg_lat=$(grep "latency average" "$RESULTS_DIR/${test}_c${c}_summary.txt" | awk '{print $4}')
            stddev=$(grep "latency stddev" "$RESULTS_DIR/${test}_c${c}_summary.txt" | awk '{print $4}')
            echo "$c,$test,$tps,$avg_lat,$stddev" >> "$RESULTS_DIR/results.csv"
        fi
    done
done

echo ""
echo "✅ Load testing complete!"
echo "Results saved to: $RESULTS_DIR"
echo "Summary report: $RESULTS_DIR/summary_report.md"
echo "CSV data: $RESULTS_DIR/results.csv"

# Check for performance issues
echo ""
echo "⚠️  Performance Analysis:"
while IFS=',' read -r clients test tps latency stddev; do
    if [ "$clients" != "client_count" ] && [ -n "$latency" ]; then
        if (( $(echo "$latency > 100" | bc -l) )); then
            echo "- WARNING: $test with $clients clients has high latency: ${latency}ms"
        fi
        if (( $(echo "$tps < 10" | bc -l) )); then
            echo "- WARNING: $test with $clients clients has low TPS: ${tps}"
        fi
    fi
done < "$RESULTS_DIR/results.csv"