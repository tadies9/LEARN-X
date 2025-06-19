/**
 * Performance Budget Checker
 * Validates test results against defined performance budgets
 */

const fs = require('fs');
const path = require('path');

// Enhanced performance budgets with dynamic thresholds
const PERFORMANCE_BUDGETS = {
  auth_flow: {
    p95: { strict: 300, normal: 500, relaxed: 800 },
    p99: { strict: 600, normal: 1000, relaxed: 1500 },
    errorRate: { strict: 0.005, normal: 0.01, relaxed: 0.02 },
    throughput: { min: 100, target: 200, max: 500 }, // RPS
  },
  file_upload: {
    p95: { strict: 2000, normal: 3000, relaxed: 5000 },
    p99: { strict: 4000, normal: 5000, relaxed: 8000 },
    errorRate: { strict: 0.02, normal: 0.05, relaxed: 0.1 },
    throughput: { min: 10, target: 20, max: 50 },
  },
  ai_generation: {
    p95: { strict: 8000, normal: 10000, relaxed: 15000 },
    p99: { strict: 12000, normal: 15000, relaxed: 20000 },
    errorRate: { strict: 0.05, normal: 0.1, relaxed: 0.15 },
    throughput: { min: 1, target: 3, max: 10 },
    tokenEfficiency: { min: 0.8, target: 0.9, max: 1.0 }, // tokens used vs expected
  },
  vector_search: {
    p95: { strict: 500, normal: 1000, relaxed: 2000 },
    p99: { strict: 1000, normal: 2000, relaxed: 3000 },
    errorRate: { strict: 0.005, normal: 0.01, relaxed: 0.02 },
    throughput: { min: 50, target: 100, max: 200 },
    accuracyScore: { min: 0.85, target: 0.9, max: 1.0 },
  },
  websocket: {
    connectionSuccessRate: { strict: 0.98, normal: 0.95, relaxed: 0.9 },
    messageLatencyP95: { strict: 50, normal: 100, relaxed: 200 },
    errorRate: { strict: 0.02, normal: 0.05, relaxed: 0.1 },
    reconnectRate: { strict: 0.95, normal: 0.9, relaxed: 0.8 },
    concurrentConnections: { min: 100, target: 200, max: 500 },
  },
  user_journey: {
    successRate: { strict: 0.9, normal: 0.8, relaxed: 0.7 },
    p95Duration: { strict: 90000, normal: 120000, relaxed: 180000 },
    stepSuccessRate: { strict: 0.95, normal: 0.9, relaxed: 0.85 },
    completionRate: { strict: 0.85, normal: 0.8, relaxed: 0.75 },
  },
  streaming_content: {
    firstChunkLatency: { strict: 1000, normal: 2000, relaxed: 3000 },
    streamingThroughput: { min: 5, target: 10, max: 20 }, // chunks/sec
    errorRate: { strict: 0.02, normal: 0.05, relaxed: 0.1 },
  },
  cache_testing: {
    hitRate: { strict: 0.8, normal: 0.5, relaxed: 0.3 },
    missLatency: { strict: 5000, normal: 8000, relaxed: 12000 },
    hitLatency: { strict: 50, normal: 100, relaxed: 200 },
  },
};

// Enhanced database performance budgets
const DB_BUDGETS = {
  vector_search: {
    avgLatency: { strict: 50, normal: 100, relaxed: 200 },
    p95Latency: { strict: 100, normal: 200, relaxed: 400 },
    minTPS: { strict: 100, normal: 50, relaxed: 25 },
    indexHitRatio: { strict: 0.98, normal: 0.95, relaxed: 0.9 },
  },
  dashboard: {
    avgLatency: { strict: 25, normal: 50, relaxed: 100 },
    p95Latency: { strict: 50, normal: 100, relaxed: 200 },
    minTPS: { strict: 200, normal: 100, relaxed: 50 },
    cacheHitRatio: { strict: 0.9, normal: 0.8, relaxed: 0.7 },
  },
  file_ops: {
    avgLatency: { strict: 15, normal: 30, relaxed: 60 },
    p95Latency: { strict: 30, normal: 60, relaxed: 120 },
    minTPS: { strict: 400, normal: 200, relaxed: 100 },
    lockWaitRatio: { strict: 0.001, normal: 0.005, relaxed: 0.01 },
  },
  concurrent_users: {
    avgLatency: { strict: 40, normal: 80, relaxed: 150 },
    p95Latency: { strict: 80, normal: 150, relaxed: 300 },
    minTPS: { strict: 150, normal: 75, relaxed: 35 },
    connectionEfficiency: { strict: 0.95, normal: 0.9, relaxed: 0.8 },
  },
  hybrid_search: {
    avgLatency: { strict: 75, normal: 150, relaxed: 300 },
    p95Latency: { strict: 150, normal: 300, relaxed: 600 },
    minTPS: { strict: 80, normal: 40, relaxed: 20 },
    relevanceScore: { strict: 0.85, normal: 0.8, relaxed: 0.7 },
  },
  index_performance: {
    avgLatency: { strict: 20, normal: 40, relaxed: 80 },
    p95Latency: { strict: 40, normal: 80, relaxed: 160 },
    minTPS: { strict: 300, normal: 150, relaxed: 75 },
    indexUsageRatio: { strict: 0.9, normal: 0.8, relaxed: 0.7 },
  },
  mixed_workload: {
    avgLatency: { strict: 60, normal: 120, relaxed: 240 },
    p95Latency: { strict: 120, normal: 240, relaxed: 480 },
    minTPS: { strict: 100, normal: 50, relaxed: 25 },
    workloadBalance: { strict: 0.9, normal: 0.8, relaxed: 0.7 },
  },
};

// Performance threshold levels
const THRESHOLD_LEVELS = {
  STRICT: 'strict',    // Best performance requirements
  NORMAL: 'normal',    // Standard production requirements  
  RELAXED: 'relaxed',  // Minimum acceptable performance
};

// Determine appropriate threshold level based on context
function getThresholdLevel() {
  const level = process.env.PERFORMANCE_LEVEL || 'normal';
  return THRESHOLD_LEVELS[level.toUpperCase()] || 'normal';
}

function findLatestResults() {
  const k6ResultsDir = path.join(__dirname, '../k6/results');
  const pgbenchResultsDir = path.join(__dirname, '../pgbench/results');
  
  let latestK6 = null;
  let latestPgbench = null;
  let historicalK6 = [];
  let historicalPgbench = [];
  
  if (fs.existsSync(k6ResultsDir)) {
    const k6Dirs = fs.readdirSync(k6ResultsDir)
      .filter(f => fs.statSync(path.join(k6ResultsDir, f)).isDirectory())
      .sort();
    latestK6 = k6Dirs.length > 0 ? path.join(k6ResultsDir, k6Dirs[k6Dirs.length - 1]) : null;
    historicalK6 = k6Dirs.slice(-10).map(dir => path.join(k6ResultsDir, dir)); // Last 10 runs
  }
  
  if (fs.existsSync(pgbenchResultsDir)) {
    const pgDirs = fs.readdirSync(pgbenchResultsDir)
      .filter(f => fs.statSync(path.join(pgbenchResultsDir, f)).isDirectory())
      .sort();
    latestPgbench = pgDirs.length > 0 ? path.join(pgbenchResultsDir, pgDirs[pgDirs.length - 1]) : null;
    historicalPgbench = pgDirs.slice(-10).map(dir => path.join(pgbenchResultsDir, dir));
  }
  
  return { 
    k6: latestK6, 
    pgbench: latestPgbench,
    historical: {
      k6: historicalK6,
      pgbench: historicalPgbench,
    }
  };
}

// Load historical performance data for trend analysis
function loadHistoricalData(resultPaths, testType) {
  const historicalData = [];
  
  for (const resultPath of resultPaths) {
    try {
      const summaryFile = path.join(resultPath, `${testType}_summary.json`);
      if (fs.existsSync(summaryFile)) {
        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
        const timestamp = fs.statSync(summaryFile).mtime;
        
        historicalData.push({
          timestamp,
          metrics: summary.metrics || {},
          path: resultPath,
        });
      }
    } catch (error) {
      console.warn(`Could not load historical data from ${resultPath}:`, error.message);
    }
  }
  
  return historicalData.sort((a, b) => a.timestamp - b.timestamp);
}

// Analyze performance trends
function analyzeTrends(historicalData, metricName) {
  if (historicalData.length < 3) {
    return { trend: 'insufficient_data', confidence: 'low' };
  }
  
  const values = historicalData.map(data => {
    const metric = data.metrics[metricName];
    if (typeof metric === 'object') {
      return metric.p95 || metric.avg || metric.value || 0;
    }
    return metric || 0;
  }).filter(v => v > 0);
  
  if (values.length < 3) {
    return { trend: 'no_data', confidence: 'low' };
  }
  
  // Calculate trend using linear regression
  const n = values.length;
  const x = values.map((_, i) => i);
  const y = values;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
  const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared for confidence
  const yMean = sumY / n;
  const totalSumSquares = y.map(yi => (yi - yMean) ** 2).reduce((a, b) => a + b, 0);
  const residualSumSquares = y.map((yi, i) => (yi - (slope * x[i] + intercept)) ** 2)
    .reduce((a, b) => a + b, 0);
  const rSquared = 1 - (residualSumSquares / totalSumSquares);
  
  // Determine trend direction and confidence
  const trendDirection = Math.abs(slope) < 0.01 ? 'stable' : 
                        slope > 0 ? 'degrading' : 'improving';
  const confidence = rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'medium' : 'low';
  
  return {
    trend: trendDirection,
    confidence,
    slope,
    rSquared,
    values,
    prediction: slope * (n + 1) + intercept, // Next expected value
    changePercent: values.length > 1 ? ((values[values.length - 1] - values[0]) / values[0] * 100) : 0,
  };
}

// Enhanced budget evaluation with dynamic thresholds
function evaluateMetric(value, budget, thresholdLevel = 'normal') {
  if (typeof budget === 'object' && budget[thresholdLevel] !== undefined) {
    const threshold = budget[thresholdLevel];
    
    // For metrics where lower is better (latency, error rates)
    if (typeof threshold === 'number') {
      if (value <= threshold) return 'pass';
      if (value <= threshold * 1.2) return 'warning';
      return 'fail';
    }
    
    // For metrics where higher is better (success rates, throughput)
    if (budget.min !== undefined) {
      if (value >= budget.target) return 'pass';
      if (value >= budget.min) return 'warning';
      return 'fail';
    }
  }
  
  // Fallback to simple comparison for legacy budgets
  if (typeof budget === 'number') {
    return value <= budget ? 'pass' : 'fail';
  }
  
  return 'unknown';
}

function checkK6Budgets(resultsDir, historicalData = {}) {
  console.log('\n📊 Checking k6 Performance Budgets...\n');
  
  const thresholdLevel = getThresholdLevel();
  console.log(`Using ${thresholdLevel.toUpperCase()} performance thresholds\n`);
  
  let violations = 0;
  let warnings = 0;
  const results = [];
  
  Object.entries(PERFORMANCE_BUDGETS).forEach(([test, budget]) => {
    const summaryFile = path.join(resultsDir, `${test}_summary.json`);
    
    if (!fs.existsSync(summaryFile)) {
      console.warn(`⚠️  No results found for ${test}`);
      return;
    }
    
    try {
      const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      const testResult = { 
        test, 
        status: 'pass', 
        violations: [], 
        warnings: [],
        trends: {},
      };
      
      // Load historical data for trend analysis
      const historical = historicalData[test] || [];
      
      // Check HTTP metrics with enhanced evaluation
      if (summary.metrics?.http_req_duration) {
        const p95 = summary.metrics.http_req_duration.p95 || 0;
        const p99 = summary.metrics.http_req_duration.p99 || 0;
        
        // P95 evaluation
        const p95Status = evaluateMetric(p95, budget.p95, thresholdLevel);
        if (p95Status === 'fail') {
          const threshold = budget.p95[thresholdLevel];
          console.error(`❌ ${test}: P95 ${p95.toFixed(2)}ms exceeds ${thresholdLevel} budget ${threshold}ms`);
          testResult.violations.push(`P95: ${p95.toFixed(2)}ms > ${threshold}ms`);
          testResult.status = 'fail';
          violations++;
        } else if (p95Status === 'warning') {
          const threshold = budget.p95[thresholdLevel];
          console.warn(`⚠️  ${test}: P95 ${p95.toFixed(2)}ms approaching ${thresholdLevel} budget ${threshold}ms`);
          testResult.warnings.push(`P95: ${p95.toFixed(2)}ms approaching ${threshold}ms`);
          if (testResult.status === 'pass') testResult.status = 'warning';
          warnings++;
        }
        
        // P99 evaluation
        const p99Status = evaluateMetric(p99, budget.p99, thresholdLevel);
        if (p99Status === 'fail') {
          const threshold = budget.p99[thresholdLevel];
          console.error(`❌ ${test}: P99 ${p99.toFixed(2)}ms exceeds ${thresholdLevel} budget ${threshold}ms`);
          testResult.violations.push(`P99: ${p99.toFixed(2)}ms > ${threshold}ms`);
          testResult.status = 'fail';
          violations++;
        } else if (p99Status === 'warning') {
          const threshold = budget.p99[thresholdLevel];
          console.warn(`⚠️  ${test}: P99 ${p99.toFixed(2)}ms approaching ${thresholdLevel} budget ${threshold}ms`);
          testResult.warnings.push(`P99: ${p99.toFixed(2)}ms approaching ${threshold}ms`);
          if (testResult.status === 'pass') testResult.status = 'warning';
          warnings++;
        }
        
        // Trend analysis for response times
        if (historical.length > 0) {
          const p95Trend = analyzeTrends(historical, 'http_req_duration');
          testResult.trends.p95 = p95Trend;
          
          if (p95Trend.trend === 'degrading' && p95Trend.confidence === 'high') {
            console.warn(`📈 ${test}: P95 response time showing degradation trend (${p95Trend.changePercent.toFixed(1)}% change)`);
            testResult.warnings.push(`Degrading P95 trend: ${p95Trend.changePercent.toFixed(1)}% increase`);
            if (testResult.status === 'pass') testResult.status = 'warning';
            warnings++;
          }
        }
      }
      
      // Check error rate
      if (summary.metrics?.errors) {
        const errorRate = summary.metrics.errors.rate || 0;
        const errorStatus = evaluateMetric(errorRate, budget.errorRate, thresholdLevel);
        
        if (errorStatus === 'fail') {
          const threshold = budget.errorRate[thresholdLevel];
          console.error(`❌ ${test}: Error rate ${(errorRate * 100).toFixed(2)}% exceeds ${thresholdLevel} budget ${(threshold * 100).toFixed(2)}%`);
          testResult.violations.push(`Error rate: ${(errorRate * 100).toFixed(2)}% > ${(threshold * 100).toFixed(2)}%`);
          testResult.status = 'fail';
          violations++;
        } else if (errorStatus === 'warning') {
          const threshold = budget.errorRate[thresholdLevel];
          console.warn(`⚠️  ${test}: Error rate ${(errorRate * 100).toFixed(2)}% approaching ${thresholdLevel} budget ${(threshold * 100).toFixed(2)}%`);
          testResult.warnings.push(`Error rate: ${(errorRate * 100).toFixed(2)}% approaching ${(threshold * 100).toFixed(2)}%`);
          if (testResult.status === 'pass') testResult.status = 'warning';
          warnings++;
        }
      }
      
      // Check throughput metrics
      if (summary.metrics?.http_reqs && budget.throughput) {
        const duration = summary.metrics.http_reqs.count / (summary.state?.testRunDurationMs / 1000 || 1);
        const throughputStatus = evaluateMetric(duration, budget.throughput, thresholdLevel);
        
        if (throughputStatus === 'fail') {
          console.error(`❌ ${test}: Throughput ${duration.toFixed(2)} RPS below minimum ${budget.throughput.min}`);
          testResult.violations.push(`Throughput: ${duration.toFixed(2)} RPS < ${budget.throughput.min} RPS`);
          testResult.status = 'fail';
          violations++;
        } else if (throughputStatus === 'warning') {
          console.warn(`⚠️  ${test}: Throughput ${duration.toFixed(2)} RPS below target ${budget.throughput.target}`);
          testResult.warnings.push(`Throughput: ${duration.toFixed(2)} RPS < ${budget.throughput.target} RPS`);
          if (testResult.status === 'pass') testResult.status = 'warning';
          warnings++;
        }
      }
      
      // Enhanced custom metrics checking
      if (test === 'websocket') {
        const connectionRate = summary.metrics?.ws_connect_success?.rate || 0;
        const connectionStatus = evaluateMetric(connectionRate, budget.connectionSuccessRate, thresholdLevel);
        
        if (connectionStatus === 'fail') {
          const threshold = budget.connectionSuccessRate[thresholdLevel];
          console.error(`❌ ${test}: Connection success rate ${(connectionRate * 100).toFixed(2)}% below ${thresholdLevel} budget ${(threshold * 100).toFixed(2)}%`);
          testResult.violations.push(`Connection success: ${(connectionRate * 100).toFixed(2)}% < ${(threshold * 100).toFixed(2)}%`);
          testResult.status = 'fail';
          violations++;
        }
        
        // Check message latency
        const msgLatency = summary.metrics?.ws_message_latency?.p95 || 0;
        const latencyStatus = evaluateMetric(msgLatency, budget.messageLatencyP95, thresholdLevel);
        
        if (latencyStatus === 'fail') {
          const threshold = budget.messageLatencyP95[thresholdLevel];
          console.error(`❌ ${test}: Message latency P95 ${msgLatency.toFixed(2)}ms exceeds ${thresholdLevel} budget ${threshold}ms`);
          testResult.violations.push(`Message latency: ${msgLatency.toFixed(2)}ms > ${threshold}ms`);
          testResult.status = 'fail';
          violations++;
        }
      }
      
      // AI generation specific metrics
      if (test === 'ai_generation' && summary.metrics?.total_tokens_used) {
        const tokenCount = summary.metrics.total_tokens_used.count || 0;
        const requestCount = summary.metrics.http_reqs?.count || 1;
        const tokensPerRequest = tokenCount / requestCount;
        
        // Check token efficiency (simplified)
        if (budget.tokenEfficiency && tokensPerRequest > 1000) { // Arbitrary threshold
          console.warn(`⚠️  ${test}: High token usage: ${tokensPerRequest.toFixed(0)} tokens per request`);
          testResult.warnings.push(`Token efficiency: ${tokensPerRequest.toFixed(0)} tokens/request`);
          if (testResult.status === 'pass') testResult.status = 'warning';
          warnings++;
        }
      }
      
      // Success message
      if (testResult.status === 'pass') {
        console.log(`✅ ${test}: All performance budgets met`);
      } else if (testResult.status === 'warning') {
        console.log(`⚠️  ${test}: Performance budgets met with warnings`);
      }
      
      results.push(testResult);
      
    } catch (error) {
      console.error(`❌ Error reading ${test} results: ${error.message}`);
      violations++;
    }
  });
  
  return { violations, warnings, results };
}

function checkPgbenchBudgets(resultsDir) {
  console.log('\n📊 Checking pgbench Performance Budgets...\n');
  
  let violations = 0;
  const results = [];
  
  // Read CSV results if available
  const csvFile = path.join(resultsDir, 'results.csv');
  if (!fs.existsSync(csvFile)) {
    console.warn('⚠️  No pgbench CSV results found');
    return { violations: 0, results: [] };
  }
  
  const csvContent = fs.readFileSync(csvFile, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  // Parse results
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length !== headers.length) continue;
    
    const result = {
      clients: parseInt(values[0]),
      test: values[1],
      tps: parseFloat(values[2]),
      avgLatency: parseFloat(values[3]),
      stddev: parseFloat(values[4]),
    };
    
    // Check against budgets
    const budget = DB_BUDGETS[result.test];
    if (!budget) continue;
    
    const testResult = {
      test: `${result.test} (${result.clients} clients)`,
      passed: true,
      violations: [],
    };
    
    if (result.avgLatency > budget.avgLatency) {
      console.error(`❌ ${testResult.test}: Avg latency ${result.avgLatency.toFixed(2)}ms exceeds budget ${budget.avgLatency}ms`);
      testResult.violations.push(`Avg latency: ${result.avgLatency.toFixed(2)}ms > ${budget.avgLatency}ms`);
      testResult.passed = false;
      violations++;
    }
    
    if (result.tps < budget.minTPS) {
      console.error(`❌ ${testResult.test}: TPS ${result.tps.toFixed(2)} below budget ${budget.minTPS}`);
      testResult.violations.push(`TPS: ${result.tps.toFixed(2)} < ${budget.minTPS}`);
      testResult.passed = false;
      violations++;
    }
    
    if (testResult.passed && result.clients >= 50) { // Only show success for higher client counts
      console.log(`✅ ${testResult.test}: All performance budgets met`);
    }
    
    results.push(testResult);
  }
  
  return { violations, results };
}

function generateReport(k6Results, pgbenchResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: k6Results.results.length + pgbenchResults.results.length,
      totalViolations: k6Results.violations + pgbenchResults.violations,
      k6Violations: k6Results.violations,
      pgbenchViolations: pgbenchResults.violations,
    },
    k6Results: k6Results.results,
    pgbenchResults: pgbenchResults.results,
    recommendations: [],
  };
  
  // Generate recommendations
  if (report.summary.totalViolations > 0) {
    report.recommendations.push('Performance degradation detected. Review recent changes.');
  }
  
  // Check for specific patterns
  const slowTests = k6Results.results.filter(r => 
    r.violations.some(v => v.includes('P95') && parseInt(v.match(/(\d+)/)[1]) > 5000)
  );
  
  if (slowTests.length > 0) {
    report.recommendations.push('Multiple endpoints showing high latency. Consider:');
    report.recommendations.push('- Database query optimization');
    report.recommendations.push('- Caching implementation');
    report.recommendations.push('- API response pagination');
  }
  
  // Save report
  const reportPath = path.join(__dirname, '../results', `performance-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  return report;
}

// Enhanced main execution with trend analysis
function main() {
  console.log('🔍 LEARN-X Enhanced Performance Budget Checker\n');
  
  const { k6, pgbench, historical } = findLatestResults();
  
  if (!k6 && !pgbench) {
    console.error('❌ No test results found. Run load tests first.');
    process.exit(1);
  }
  
  // Load historical data for trend analysis
  const k6HistoricalData = {};
  const pgbenchHistoricalData = {};
  
  if (historical.k6.length > 1) {
    console.log(`📈 Loading historical data from ${historical.k6.length} k6 test runs for trend analysis\n`);
    Object.keys(PERFORMANCE_BUDGETS).forEach(test => {
      k6HistoricalData[test] = loadHistoricalData(historical.k6, test);
    });
  }
  
  if (historical.pgbench.length > 1) {
    console.log(`📈 Loading historical data from ${historical.pgbench.length} pgbench test runs for trend analysis\n`);
    Object.keys(DB_BUDGETS).forEach(test => {
      pgbenchHistoricalData[test] = loadHistoricalData(historical.pgbench, test);
    });
  }
  
  let k6Results = { violations: 0, warnings: 0, results: [] };
  let pgbenchResults = { violations: 0, warnings: 0, results: [] };
  
  if (k6) {
    console.log(`Found k6 results: ${k6}`);
    k6Results = checkK6Budgets(k6, k6HistoricalData);
  }
  
  if (pgbench) {
    console.log(`Found pgbench results: ${pgbench}`);
    pgbenchResults = checkPgbenchBudgets(pgbench, pgbenchHistoricalData);
  }
  
  const report = generateEnhancedReport(k6Results, pgbenchResults);
  
  // Enhanced summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENHANCED PERFORMANCE BUDGET CHECK SUMMARY');
  console.log('='.repeat(60));
  console.log(`Performance Level: ${getThresholdLevel().toUpperCase()}`);
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Critical Violations: ${report.summary.totalViolations}`);
  console.log(`Warnings: ${report.summary.totalWarnings}`);
  console.log(`k6 Tests - Violations: ${report.summary.k6Violations}, Warnings: ${report.summary.k6Warnings}`);
  console.log(`pgbench Tests - Violations: ${report.summary.pgbenchViolations}, Warnings: ${report.summary.pgbenchWarnings}`);
  
  // Trend summary
  if (report.trends && report.trends.length > 0) {
    console.log('\n📈 Performance Trends:');
    report.trends.forEach(trend => {
      const icon = trend.direction === 'degrading' ? '📉' : 
                   trend.direction === 'improving' ? '📈' : '➡️';
      console.log(`  ${icon} ${trend.test}: ${trend.metric} ${trend.direction} (${trend.confidence} confidence)`);
    });
  }
  
  // Performance recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 Performance Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  // Threshold recommendations
  if (report.thresholdRecommendations && report.thresholdRecommendations.length > 0) {
    console.log('\n⚙️  Threshold Recommendations:');
    report.thresholdRecommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  // Health score
  if (report.healthScore !== undefined) {
    const healthIcon = report.healthScore >= 90 ? '💚' : 
                      report.healthScore >= 70 ? '💛' : '❤️';
    console.log(`\n${healthIcon} Overall Performance Health Score: ${report.healthScore}/100`);
  }
  
  // Exit with appropriate code
  if (report.summary.totalViolations > 0) {
    console.log('\n❌ Performance budget check FAILED');
    process.exit(1);
  } else if (report.summary.totalWarnings > 0) {
    console.log('\n⚠️  Performance budget check PASSED with warnings');
    process.exit(2);
  } else {
    console.log('\n✅ All performance budgets met!');
    process.exit(0);
  }
}

// Enhanced report generation
function generateEnhancedReport(k6Results, pgbenchResults) {
  const report = {
    timestamp: new Date().toISOString(),
    thresholdLevel: getThresholdLevel(),
    summary: {
      totalTests: k6Results.results.length + pgbenchResults.results.length,
      totalViolations: k6Results.violations + pgbenchResults.violations,
      totalWarnings: (k6Results.warnings || 0) + (pgbenchResults.warnings || 0),
      k6Violations: k6Results.violations,
      k6Warnings: k6Results.warnings || 0,
      pgbenchViolations: pgbenchResults.violations,
      pgbenchWarnings: pgbenchResults.warnings || 0,
    },
    k6Results: k6Results.results,
    pgbenchResults: pgbenchResults.results,
    trends: [],
    recommendations: [],
    thresholdRecommendations: [],
    healthScore: 0,
  };
  
  // Extract trends from test results
  [...k6Results.results, ...pgbenchResults.results].forEach(result => {
    if (result.trends) {
      Object.entries(result.trends).forEach(([metric, trendData]) => {
        if (trendData.trend !== 'stable' && trendData.confidence !== 'low') {
          report.trends.push({
            test: result.test,
            metric,
            direction: trendData.trend,
            confidence: trendData.confidence,
            changePercent: trendData.changePercent,
          });
        }
      });
    }
  });
  
  // Generate enhanced recommendations
  if (report.summary.totalViolations > 0) {
    report.recommendations.push('Performance degradation detected. Review recent changes and optimize critical paths.');
  }
  
  if (report.summary.totalWarnings > 5) {
    report.recommendations.push('Multiple performance warnings indicate system stress. Consider infrastructure scaling.');
  }
  
  // Trend-based recommendations
  const degradingTrends = report.trends.filter(t => t.direction === 'degrading').length;
  if (degradingTrends > 0) {
    report.recommendations.push(`${degradingTrends} performance metrics showing degradation. Implement performance monitoring alerts.`);
  }
  
  // Threshold level recommendations
  const currentLevel = getThresholdLevel();
  if (currentLevel === 'relaxed' && report.summary.totalViolations === 0) {
    report.thresholdRecommendations.push('Consider upgrading to NORMAL thresholds for better performance standards');
  } else if (currentLevel === 'normal' && report.summary.totalViolations === 0 && report.summary.totalWarnings < 3) {
    report.thresholdRecommendations.push('System performing well - consider STRICT thresholds for production excellence');
  } else if (currentLevel === 'strict' && report.summary.totalViolations > 3) {
    report.thresholdRecommendations.push('Consider NORMAL thresholds if STRICT requirements are too aggressive for current infrastructure');
  }
  
  // Calculate health score
  let score = 100;
  score -= report.summary.totalViolations * 15; // 15 points per violation
  score -= report.summary.totalWarnings * 5;    // 5 points per warning
  score -= degradingTrends * 10;                // 10 points per degrading trend
  
  report.healthScore = Math.max(0, Math.round(score));
  
  // Save enhanced report
  const reportPath = path.join(__dirname, '../results', `performance-budget-check-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Enhanced report saved to: ${reportPath}`);
  
  return report;
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkK6Budgets, checkPgbenchBudgets, PERFORMANCE_BUDGETS, DB_BUDGETS };