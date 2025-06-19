#!/bin/bash

# k6 Load Testing Script for LEARN-X API
# Runs comprehensive API load tests

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
WS_URL="${WS_URL:-ws://localhost:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token}"
RESULTS_DIR="./results/k6/$(date +%Y%m%d_%H%M%S)"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "🚀 Starting k6 API load tests..."
echo "API Base URL: $BASE_URL"
echo "WebSocket URL: $WS_URL"
echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Function to run a single k6 test
run_k6_test() {
    local test_name=$1
    local script_file=$2
    local extra_args="${3:-}"
    
    echo "📊 Running test: $test_name"
    echo "Script: $script_file"
    
    k6 run \
        --out json="$RESULTS_DIR/${test_name}_raw.json" \
        --summary-export="$RESULTS_DIR/${test_name}_summary.json" \
        --env BASE_URL="$BASE_URL" \
        --env WS_URL="$WS_URL" \
        --env AUTH_TOKEN="$AUTH_TOKEN" \
        $extra_args \
        "$script_file" \
        2>&1 | tee "$RESULTS_DIR/${test_name}_output.txt"
    
    echo "✓ Completed $test_name"
    echo ""
}

# Test 1: Authentication Flow
run_k6_test "auth_flow" "./01_auth_flow.js"

# Test 2: File Upload (with lower VUs due to resource intensity)
run_k6_test "file_upload" "./02_file_upload.js" "--vus 10"

# Test 3: AI Generation (with rate limits)
run_k6_test "ai_generation" "./03_ai_generation.js"

# Test 4: Vector Search
run_k6_test "vector_search" "./04_vector_search.js"

# Test 5: WebSocket Stress Test
run_k6_test "websocket" "./05_websocket_stress.js"

# Test 6: Full User Journey
run_k6_test "user_journey" "./06_full_user_journey.js"

# Generate HTML reports
echo "📈 Generating HTML reports..."

for test in auth_flow file_upload ai_generation vector_search websocket user_journey; do
    if [ -f "$RESULTS_DIR/${test}_summary.json" ]; then
        # Generate simple HTML report
        cat > "$RESULTS_DIR/${test}_report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>k6 Test Report: ${test}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; background: #f0f0f0; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>k6 Load Test Report: ${test}</h1>
    <h2>Summary</h2>
    <pre>$(cat "$RESULTS_DIR/${test}_summary.json" | jq '.')</pre>
</body>
</html>
EOF
    fi
done

# Generate consolidated summary report
echo "📊 Generating consolidated summary..."

cat > "$RESULTS_DIR/summary_report.md" << EOF
# k6 Load Test Results Summary
Generated: $(date)

## Test Configuration
- API Base URL: $BASE_URL
- WebSocket URL: $WS_URL

## Test Results

### 1. Authentication Flow
$(cat "$RESULTS_DIR/auth_flow_summary.json" 2>/dev/null | jq -r '.metrics.http_req_duration | "- P95 Response Time: \(.p95)ms\n- P99 Response Time: \(.p99)ms"' || echo "- Test not completed")

### 2. File Upload
$(cat "$RESULTS_DIR/file_upload_summary.json" 2>/dev/null | jq -r '.metrics.http_req_duration | "- P95 Response Time: \(.p95)ms\n- P99 Response Time: \(.p99)ms"' || echo "- Test not completed")

### 3. AI Generation
$(cat "$RESULTS_DIR/ai_generation_summary.json" 2>/dev/null | jq -r '.metrics.http_req_duration | "- P95 Response Time: \(.p95)ms\n- P99 Response Time: \(.p99)ms"' || echo "- Test not completed")

### 4. Vector Search
$(cat "$RESULTS_DIR/vector_search_summary.json" 2>/dev/null | jq -r '.metrics.http_req_duration | "- P95 Response Time: \(.p95)ms\n- P99 Response Time: \(.p99)ms"' || echo "- Test not completed")

### 5. WebSocket Connections
$(cat "$RESULTS_DIR/websocket_summary.json" 2>/dev/null | jq -r '.metrics.ws_connecting | "- Total Connections: \(.count)\n- Success Rate: \(.rate)"' || echo "- Test not completed")

### 6. Full User Journey
$(cat "$RESULTS_DIR/user_journey_summary.json" 2>/dev/null | jq -r '.metrics.journey_complete | "- Journey Success Rate: \(.rate)\n- P95 Journey Duration: \(.p95)ms"' || echo "- Test not completed")

## Performance Analysis
EOF

# Analyze results and add warnings
echo "" >> "$RESULTS_DIR/summary_report.md"
echo "### ⚠️ Performance Warnings" >> "$RESULTS_DIR/summary_report.md"

for test in auth_flow file_upload ai_generation vector_search websocket user_journey; do
    if [ -f "$RESULTS_DIR/${test}_summary.json" ]; then
        p95=$(cat "$RESULTS_DIR/${test}_summary.json" | jq -r '.metrics.http_req_duration.p95 // 0')
        if [ "$p95" != "0" ] && [ "$p95" != "null" ]; then
            if (( $(echo "$p95 > 3000" | bc -l) )); then
                echo "- **${test}**: P95 response time exceeds 3s threshold (${p95}ms)" >> "$RESULTS_DIR/summary_report.md"
            fi
        fi
    fi
done

# Create performance baseline file
cat > "$RESULTS_DIR/performance_baseline.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": {
    "base_url": "$BASE_URL",
    "ws_url": "$WS_URL"
  },
  "baselines": {
    "auth_flow": {
      "p95_target_ms": 500,
      "error_rate_max": 0.01
    },
    "file_upload": {
      "p95_target_ms": 3000,
      "error_rate_max": 0.05
    },
    "ai_generation": {
      "p95_target_ms": 10000,
      "error_rate_max": 0.1
    },
    "vector_search": {
      "p95_target_ms": 1000,
      "error_rate_max": 0.01
    },
    "websocket": {
      "connection_success_rate_min": 0.95,
      "message_latency_p95_ms": 100
    },
    "user_journey": {
      "success_rate_min": 0.8,
      "p95_duration_ms": 120000
    }
  }
}
EOF

echo ""
echo "✅ Load testing complete!"
echo "Results saved to: $RESULTS_DIR"
echo "Summary report: $RESULTS_DIR/summary_report.md"
echo "Performance baseline: $RESULTS_DIR/performance_baseline.json"
echo ""
echo "View HTML reports in: $RESULTS_DIR/*_report.html"