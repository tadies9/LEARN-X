#!/usr/bin/env node

/**
 * E2E Test Runner for LEARN-X
 * 
 * Runs comprehensive end-to-end tests and generates detailed reports.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testTimeout: 600000, // 10 minutes
  retryAttempts: 2,
  generateReport: true,
  outputDir: './test-results',
  parallel: false
};

class E2ETestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
  }

  async run() {
    console.log('🚀 Starting LEARN-X End-to-End Tests...\n');
    
    try {
      // Pre-flight checks
      await this.runPreflightChecks();
      
      // Run the main E2E test suite
      await this.runMainTestSuite();
      
      // Generate reports
      if (config.generateReport) {
        await this.generateReports();
      }
      
      // Display final results
      this.displayFinalResults();
      
    } catch (error) {
      console.error('❌ E2E Tests Failed:', error.message);
      process.exit(1);
    }
  }

  async runPreflightChecks() {
    console.log('🔍 Running pre-flight system checks...');
    
    const checks = [
      this.checkEnvironment,
      this.checkDependencies,
      this.checkServices
    ];
    
    for (const check of checks) {
      await check.call(this);
    }
    
    console.log('✅ Pre-flight checks completed\n');
  }

  async checkEnvironment() {
    console.log('  📋 Checking environment...');
    
    // Check required environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'OPENAI_API_KEY'
    ];
    
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  async checkDependencies() {
    console.log('  📦 Checking dependencies...');
    
    try {
      execSync('npm list --depth=0', { stdio: 'pipe' });
    } catch (error) {
      console.warn('  ⚠️ Some dependencies may be missing, continuing...');
    }
  }

  async checkServices() {
    console.log('  🔧 Checking services...');
    
    try {
      // Check if the backend server is running
      const response = await fetch('http://localhost:8080/health');
      if (!response.ok) {
        throw new Error('Backend server not responding');
      }
    } catch (error) {
      console.warn('  ⚠️ Backend server not running, tests may fail');
    }
  }

  async runMainTestSuite() {
    console.log('🧪 Running comprehensive E2E test suite...\n');
    
    const testCommand = [
      'npx jest',
      '--testPathPattern=e2e-comprehensive-flow.test.ts',
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      `--testTimeout=${config.testTimeout}`,
      '--runInBand' // Run tests serially for better debugging
    ].join(' ');
    
    try {
      const output = execSync(testCommand, { 
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: __dirname
      });
      
      console.log(output);
      this.parseTestResults(output);
      
    } catch (error) {
      console.error('Test execution failed:');
      console.error(error.stdout || error.message);
      throw error;
    }
  }

  parseTestResults(output) {
    // Parse Jest output to extract test results
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed.*?(\d+) failed.*?(\d+) total/);
        if (match) {
          this.results.passed = parseInt(match[1]);
          this.results.failed = parseInt(match[2]);
          this.results.total = parseInt(match[3]);
        }
      }
    }
  }

  async generateReports() {
    console.log('📊 Generating test reports...\n');
    
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Generate JSON report
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    const jsonReport = path.join(config.outputDir, 'e2e-test-report.json');
    fs.writeFileSync(jsonReport, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report (basic)
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlReportPath = path.join(config.outputDir, 'e2e-test-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`📁 Reports generated in: ${config.outputDir}`);
    console.log(`  📄 JSON Report: ${jsonReport}`);
    console.log(`  🌐 HTML Report: ${htmlReportPath}\n`);
  }

  generateHTMLReport(data) {
    const successRate = data.results.total > 0 ? 
      (data.results.passed / data.results.total * 100).toFixed(1) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>LEARN-X E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; flex: 1; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LEARN-X End-to-End Test Report</h1>
        <p><strong>Generated:</strong> ${data.timestamp}</p>
        <p><strong>Duration:</strong> ${(data.duration / 1000).toFixed(1)} seconds</p>
    </div>
    
    <div class="stats">
        <div class="stat">
            <h3>Total Tests</h3>
            <p style="font-size: 24px; margin: 0;">${data.results.total}</p>
        </div>
        <div class="stat">
            <h3 class="success">Passed</h3>
            <p style="font-size: 24px; margin: 0;">${data.results.passed}</p>
        </div>
        <div class="stat">
            <h3 class="failure">Failed</h3>
            <p style="font-size: 24px; margin: 0;">${data.results.failed}</p>
        </div>
        <div class="stat">
            <h3>Success Rate</h3>
            <p style="font-size: 24px; margin: 0;">${successRate}%</p>
        </div>
    </div>
    
    <h2>Test Coverage</h2>
    <ul>
        <li>✅ Complete User Journey Testing</li>
        <li>✅ Cross-Service Integration Testing</li>
        <li>✅ Performance Integration Testing</li>
        <li>✅ Data Flow Validation</li>
        <li>✅ Admin Dashboard Functionality</li>
        <li>✅ System Health and Monitoring</li>
    </ul>
    
    <h2>Environment</h2>
    <ul>
        <li><strong>Node.js:</strong> ${data.environment.node}</li>
        <li><strong>Platform:</strong> ${data.environment.platform}</li>
        <li><strong>Architecture:</strong> ${data.environment.arch}</li>
    </ul>
</body>
</html>`;
  }

  displayFinalResults() {
    const duration = (Date.now() - this.startTime) / 1000;
    const successRate = this.results.total > 0 ? 
      (this.results.passed / this.results.total * 100).toFixed(1) : 0;
    
    console.log('🎯 E2E Test Results Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (this.results.failed > 0) {
      console.log('⚠️  Some tests failed. Check the detailed reports for more information.');
      process.exit(1);
    } else {
      console.log('🎉 All E2E tests passed successfully!');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;