# LEARN-X Performance Testing Guide

## Overview

This guide provides comprehensive instructions for running performance and load tests on the LEARN-X platform. The testing suite includes database benchmarks, API load tests, WebSocket stress tests, and full user journey simulations.

## Prerequisites

### Required Tools

1. **pgbench** - PostgreSQL benchmarking tool
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-contrib
   ```

2. **k6** - Modern load testing tool
   ```bash
   # macOS
   brew install k6
   
   # Ubuntu/Debian
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

3. **jq** - JSON processor (for result parsing)
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

### Environment Setup

1. Create test users in the database:
   ```sql
   -- Run in your PostgreSQL database
   INSERT INTO users (id, email, created_at, updated_at) VALUES
   ('b2ce911b-ae6a-46b5-9eaa-53cc3696a14a', 'test1@example.com', NOW(), NOW()),
   ('b2ce911b-ae6a-46b5-9eaa-53cc3696a14b', 'test2@example.com', NOW(), NOW()),
   ('b2ce911b-ae6a-46b5-9eaa-53cc3696a14c', 'test3@example.com', NOW(), NOW());
   ```

2. Set environment variables:
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=learnx
   export DB_USER=postgres
   export BASE_URL=http://localhost:8080/api/v1
   export WS_URL=ws://localhost:8080
   export AUTH_TOKEN=your-test-token
   ```

## Database Load Testing (pgbench)

### Test Scenarios

1. **Vector Search Performance**
   - Tests search_file_chunks function
   - Simulates semantic search queries
   - Measures vector similarity performance

2. **Dashboard Queries**
   - Tests materialized view performance
   - Complex aggregation queries
   - User activity summaries

3. **File Operations**
   - Chunk retrieval performance
   - Batch update operations
   - File processing status checks

4. **Concurrent Users**
   - Multi-user access patterns
   - Session creation/management
   - Resource contention testing

### Running pgbench Tests

```bash
cd load-testing/pgbench
./run_pgbench_tests.sh
```

### Interpreting pgbench Results

Key metrics to monitor:
- **TPS (Transactions Per Second)**: Higher is better
- **Average Latency**: Lower is better (target < 100ms)
- **Standard Deviation**: Lower indicates consistent performance

Example output analysis:
```
tps = 245.3 (excluding connections establishing)
latency average = 40.8 ms
latency stddev = 12.3 ms
```

## API Load Testing (k6)

### Test Scenarios

1. **Authentication Flow** (`01_auth_flow.js`)
   - Login/logout cycles
   - Token validation
   - Session management

2. **File Upload** (`02_file_upload.js`)
   - Concurrent file uploads
   - Processing status polling
   - Chunk retrieval

3. **AI Generation** (`03_ai_generation.js`)
   - Outline generation
   - Content generation
   - Cache hit rates

4. **Vector Search** (`04_vector_search.js`)
   - Basic searches
   - Filtered searches
   - Burst search patterns

5. **WebSocket Stress** (`05_websocket_stress.js`)
   - Connection scaling
   - Message throughput
   - Latency measurements

6. **Full User Journey** (`06_full_user_journey.js`)
   - Complete workflow simulation
   - End-to-end performance

### Running k6 Tests

```bash
cd load-testing/k6

# Run all tests
./run_k6_tests.sh

# Run individual test
k6 run --env BASE_URL=http://localhost:8080/api/v1 01_auth_flow.js
```

### k6 Performance Thresholds

| Test | Metric | Threshold | Description |
|------|--------|-----------|-------------|
| Auth Flow | p95 < 500ms | Response time | 95% of requests under 500ms |
| File Upload | p95 < 3000ms | Response time | 95% of uploads under 3s |
| AI Generation | p95 < 10000ms | Response time | 95% of AI requests under 10s |
| Vector Search | p95 < 1000ms | Response time | 95% of searches under 1s |
| WebSocket | success > 95% | Connection rate | 95% successful connections |
| User Journey | success > 80% | Completion rate | 80% of journeys complete |

## Performance Baselines

### Current Baseline Metrics

Based on testing with standard infrastructure:

#### Database Performance
- Vector search: ~50ms average latency (100 concurrent users)
- Dashboard queries: ~30ms average latency
- File operations: ~20ms average latency
- Concurrent users: Supports 200+ simultaneous connections

#### API Performance
- Authentication: < 200ms p95
- File upload: < 2s p95 (100KB files)
- AI generation: < 8s p95 (with caching)
- Vector search: < 500ms p95
- WebSocket: < 50ms message latency

### Performance Budgets

| Component | Budget | Alert Threshold | Critical Threshold |
|-----------|--------|-----------------|-------------------|
| API Response | 1s p95 | 2s p95 | 5s p95 |
| Database Query | 100ms avg | 200ms avg | 500ms avg |
| File Processing | 30s | 60s | 120s |
| AI Generation | 10s | 15s | 30s |
| WebSocket Latency | 100ms | 200ms | 500ms |

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/performance-tests.yml`:

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install k6
      run: |
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run migrations
      run: |
        cd backend
        npm run migrate
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/learnx
    
    - name: Start API server
      run: |
        cd backend
        npm start &
        sleep 10  # Wait for server to start
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/learnx
    
    - name: Run k6 tests
      run: |
        cd backend/load-testing/k6
        ./run_k6_tests.sh
      env:
        BASE_URL: http://localhost:8080/api/v1
    
    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results
        path: backend/load-testing/k6/results/
    
    - name: Check performance budgets
      run: |
        cd backend/load-testing
        node scripts/check-budgets.js
```

### Performance Monitoring Script

Create `load-testing/scripts/check-budgets.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Load performance budgets
const budgets = {
  auth_flow: { p95: 500, errorRate: 0.01 },
  file_upload: { p95: 3000, errorRate: 0.05 },
  ai_generation: { p95: 10000, errorRate: 0.1 },
  vector_search: { p95: 1000, errorRate: 0.01 },
};

// Find latest results directory
const resultsDir = path.join(__dirname, '../k6/results');
const latestDir = fs.readdirSync(resultsDir)
  .filter(f => fs.statSync(path.join(resultsDir, f)).isDirectory())
  .sort()
  .pop();

if (!latestDir) {
  console.error('No results found');
  process.exit(1);
}

// Check each test against budgets
let failures = 0;

Object.entries(budgets).forEach(([test, budget]) => {
  const summaryFile = path.join(resultsDir, latestDir, `${test}_summary.json`);
  
  if (!fs.existsSync(summaryFile)) {
    console.warn(`⚠️  No results for ${test}`);
    return;
  }
  
  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  const p95 = summary.metrics?.http_req_duration?.p95 || 0;
  const errorRate = summary.metrics?.errors?.rate || 0;
  
  if (p95 > budget.p95) {
    console.error(`❌ ${test}: P95 ${p95}ms exceeds budget ${budget.p95}ms`);
    failures++;
  } else {
    console.log(`✅ ${test}: P95 ${p95}ms within budget`);
  }
  
  if (errorRate > budget.errorRate) {
    console.error(`❌ ${test}: Error rate ${errorRate} exceeds budget ${budget.errorRate}`);
    failures++;
  }
});

if (failures > 0) {
  console.error(`\n❌ ${failures} performance budget violations found`);
  process.exit(1);
} else {
  console.log('\n✅ All performance budgets met');
}
```

## Supabase Plan Validation

### Current Limits (Free Tier)

- Database size: 500 MB
- File storage: 1 GB
- Bandwidth: 2 GB
- Concurrent connections: 60
- API requests: 500K/month

### Resource Usage Monitoring

```sql
-- Check database size
SELECT pg_database_size('learnx') / 1024 / 1024 as size_mb;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;
```

### Upgrade Recommendations

Based on load testing results:

1. **Pro Plan ($25/month)** recommended when:
   - Database size approaches 400 MB
   - Need > 60 concurrent connections
   - API requests exceed 400K/month
   - Require point-in-time recovery

2. **Team Plan ($599/month)** recommended when:
   - Database size > 8 GB
   - Need dedicated CPU resources
   - Require read replicas
   - Need 99.95% uptime SLA

## Best Practices

1. **Run tests regularly**
   - Daily performance regression tests
   - Weekly comprehensive load tests
   - Monthly capacity planning tests

2. **Monitor trends**
   - Track performance over time
   - Identify degradation early
   - Plan capacity proactively

3. **Test realistically**
   - Use production-like data volumes
   - Simulate actual user patterns
   - Include think time in scripts

4. **Analyze comprehensively**
   - Look beyond averages
   - Check percentiles (p95, p99)
   - Monitor error rates

5. **Optimize iteratively**
   - Profile before optimizing
   - Test optimization impact
   - Document improvements

## Troubleshooting

### Common Issues

1. **High database latency**
   - Check missing indexes
   - Analyze slow queries
   - Review connection pooling

2. **API timeouts**
   - Check rate limiting
   - Review caching strategy
   - Optimize database queries

3. **WebSocket disconnections**
   - Check connection limits
   - Review keepalive settings
   - Monitor memory usage

4. **AI generation delays**
   - Check OpenAI rate limits
   - Review caching effectiveness
   - Consider request batching

### Performance Debugging

```bash
# Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

# Check slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

# Monitor connections
watch -n 1 'psql -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"'

# Check cache hit rates
SELECT 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

## Reporting

Generate performance reports:

```bash
cd load-testing
node scripts/generate-report.js

# Creates:
# - results/performance-report-YYYYMMDD.html
# - results/performance-trends.json
# - results/recommendations.md
```

Report includes:
- Executive summary
- Test results by category
- Performance trends
- Bottleneck analysis
- Optimization recommendations
- Capacity planning projections