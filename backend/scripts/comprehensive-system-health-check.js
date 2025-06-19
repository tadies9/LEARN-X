#!/usr/bin/env node

/**
 * Comprehensive System Health Check for LEARN-X
 * Tests all services, connections, and integrations
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  backend: {
    host: process.env.BACKEND_HOST || 'http://localhost:3001',
    timeout: 30000
  },
  pythonAI: {
    host: process.env.PYTHON_AI_HOST || 'http://localhost:8001',
    timeout: 30000
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
};

class SystemHealthChecker {
  constructor() {
    this.results = {
      services: {},
      databases: {},
      cache: {},
      queues: {},
      apis: {},
      frontend: {},
      monitoring: {},
      overall: { status: 'unknown', score: 0, total: 0 }
    };
    this.startTime = Date.now();
  }

  // Utility methods
  async makeRequest(url, options = {}) {
    try {
      const response = await axios({
        url,
        timeout: 30000,
        ...options
      });
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        status: error.response?.status || 'network_error' 
      };
    }
  }

  updateScore(passed) {
    this.results.overall.total++;
    if (passed) this.results.overall.score++;
  }

  // Service connectivity tests
  async testBackendService() {
    console.log('🔍 Testing Backend Service...');
    
    const tests = [
      { name: 'Health Check', endpoint: '/health' },
      { name: 'API Status', endpoint: '/api/health' },
      { name: 'Database Status', endpoint: '/health/database' },
      { name: 'Queue Status', endpoint: '/health/queues' },
      { name: 'Performance Metrics', endpoint: '/health/performance' }
    ];

    this.results.services.backend = { tests: {}, overall: 'unknown' };
    let passedTests = 0;

    for (const test of tests) {
      const result = await this.makeRequest(`${config.backend.host}${test.endpoint}`);
      this.results.services.backend.tests[test.name] = {
        status: result.success ? 'pass' : 'fail',
        error: result.error,
        response: result.data
      };
      
      if (result.success) passedTests++;
      this.updateScore(result.success);
    }

    this.results.services.backend.overall = passedTests === tests.length ? 'healthy' : 
                                           passedTests > 0 ? 'degraded' : 'unhealthy';
  }

  async testPythonAIService() {
    console.log('🧠 Testing Python AI Service...');
    
    const tests = [
      { name: 'Health Check', endpoint: '/health' },
      { name: 'AI Health', endpoint: '/health/ai' },
      { name: 'Queue Health', endpoint: '/health/queue' },
      { name: 'Embeddings Health', endpoint: '/health/embeddings' }
    ];

    this.results.services.pythonAI = { tests: {}, overall: 'unknown' };
    let passedTests = 0;

    for (const test of tests) {
      const result = await this.makeRequest(`${config.pythonAI.host}${test.endpoint}`);
      this.results.services.pythonAI.tests[test.name] = {
        status: result.success ? 'pass' : 'fail',
        error: result.error,
        response: result.data
      };
      
      if (result.success) passedTests++;
      this.updateScore(result.success);
    }

    this.results.services.pythonAI.overall = passedTests === tests.length ? 'healthy' : 
                                            passedTests > 0 ? 'degraded' : 'unhealthy';
  }

  async testServiceCommunication() {
    console.log('🔗 Testing Inter-Service Communication...');
    
    // Test Backend -> Python AI communication
    const result = await this.makeRequest(`${config.backend.host}/api/ai/health-check`);
    this.results.services.communication = {
      backendToPython: {
        status: result.success ? 'pass' : 'fail',
        error: result.error,
        response: result.data
      }
    };
    
    this.updateScore(result.success);
  }

  async testSupabaseConnection() {
    console.log('🗄️ Testing Supabase Database...');
    
    if (!config.supabase.url || !config.supabase.key) {
      this.results.databases.supabase = {
        status: 'fail',
        error: 'Missing Supabase configuration'
      };
      this.updateScore(false);
      return;
    }

    try {
      const supabase = createClient(config.supabase.url, config.supabase.key);
      
      // Test basic connection
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      this.results.databases.supabase = {
        status: error ? 'fail' : 'pass',
        error: error?.message,
        connectionTime: Date.now() - this.startTime
      };
      
      this.updateScore(!error);
    } catch (error) {
      this.results.databases.supabase = {
        status: 'fail',
        error: error.message
      };
      this.updateScore(false);
    }
  }

  async testRedisConnection() {
    console.log('🔄 Testing Redis Cache...');
    
    let redis;
    try {
      redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        connectTimeout: 10000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      // Test connection
      await redis.ping();
      
      // Test set/get operations
      const testKey = 'health-check-test';
      const testValue = JSON.stringify({ timestamp: Date.now() });
      
      await redis.set(testKey, testValue, 'EX', 60);
      const retrieved = await redis.get(testKey);
      
      const operationsWork = retrieved === testValue;
      await redis.del(testKey);

      this.results.cache.redis = {
        status: operationsWork ? 'pass' : 'fail',
        ping: 'success',
        operations: operationsWork ? 'success' : 'failed'
      };
      
      this.updateScore(operationsWork);
    } catch (error) {
      this.results.cache.redis = {
        status: 'fail',
        error: error.message
      };
      this.updateScore(false);
    } finally {
      if (redis) redis.disconnect();
    }
  }

  async testPGMQQueues() {
    console.log('📬 Testing PGMQ Queue System...');
    
    const result = await this.makeRequest(`${config.backend.host}/health/queues`);
    
    this.results.queues.pgmq = {
      status: result.success ? 'pass' : 'fail',
      error: result.error,
      queueStatus: result.data?.queues || {}
    };
    
    this.updateScore(result.success);
  }

  async testAPIEndpoints() {
    console.log('🌐 Testing API Endpoints...');
    
    const endpoints = [
      // Admin endpoints
      { category: 'admin', name: 'Dashboard Stats', endpoint: '/api/admin/dashboard/stats' },
      { category: 'admin', name: 'System Health', endpoint: '/api/admin/health' },
      
      // AI endpoints
      { category: 'ai', name: 'AI Health', endpoint: '/api/ai/health' },
      { category: 'ai', name: 'Content Generation Status', endpoint: '/api/ai/status' },
      
      // Vector search endpoints  
      { category: 'search', name: 'Search Health', endpoint: '/api/search/health' },
      { category: 'search', name: 'Vector Status', endpoint: '/api/vector/status' },
      
      // Core API endpoints
      { category: 'core', name: 'Course API', endpoint: '/api/courses' },
      { category: 'core', name: 'File API', endpoint: '/api/files' }
    ];

    this.results.apis = {};
    
    for (const endpoint of endpoints) {
      if (!this.results.apis[endpoint.category]) {
        this.results.apis[endpoint.category] = {};
      }
      
      const result = await this.makeRequest(`${config.backend.host}${endpoint.endpoint}`, {
        headers: { 'Authorization': 'Bearer test-token' } // Mock auth for testing
      });
      
      this.results.apis[endpoint.category][endpoint.name] = {
        status: result.success || result.status === 401 ? 'pass' : 'fail', // 401 is OK - means endpoint exists
        error: result.error,
        httpStatus: result.status
      };
      
      // Count as pass if endpoint exists (even if auth fails)
      this.updateScore(result.success || result.status === 401);
    }
  }

  async testFrontendHealth() {
    console.log('🖥️ Testing Frontend Health...');
    
    // Check if frontend build files exist
    const frontendPath = path.join(__dirname, '../../frontend');
    
    try {
      const packageJsonExists = await fs.access(path.join(frontendPath, 'package.json')).then(() => true).catch(() => false);
      const nextConfigExists = await fs.access(path.join(frontendPath, 'next.config.js')).then(() => true).catch(() => false);
      const sentryConfigExists = await fs.access(path.join(frontendPath, 'sentry.client.config.ts')).then(() => true).catch(() => false);
      
      this.results.frontend = {
        configuration: {
          packageJson: packageJsonExists ? 'pass' : 'fail',
          nextConfig: nextConfigExists ? 'pass' : 'fail',
          sentryConfig: sentryConfigExists ? 'pass' : 'fail'
        },
        overall: (packageJsonExists && nextConfigExists) ? 'healthy' : 'unhealthy'
      };
      
      this.updateScore(packageJsonExists);
      this.updateScore(nextConfigExists);
      this.updateScore(sentryConfigExists);
      
    } catch (error) {
      this.results.frontend = {
        status: 'fail',
        error: error.message
      };
      this.updateScore(false);
    }
  }

  async testMonitoringHealth() {
    console.log('📊 Testing Monitoring Systems...');
    
    // Test APM endpoints
    const apmResult = await this.makeRequest(`${config.backend.host}/api/monitoring/apm/health`);
    
    // Test Sentry configuration
    const sentryConfigPath = path.join(__dirname, '../src/config/sentry.ts');
    const sentryConfigExists = await fs.access(sentryConfigPath).then(() => true).catch(() => false);
    
    this.results.monitoring = {
      apm: {
        status: apmResult.success ? 'pass' : 'fail',
        error: apmResult.error,
        data: apmResult.data
      },
      sentry: {
        configExists: sentryConfigExists ? 'pass' : 'fail'
      },
      overall: (apmResult.success && sentryConfigExists) ? 'healthy' : 'degraded'
    };
    
    this.updateScore(apmResult.success);
    this.updateScore(sentryConfigExists);
  }

  calculateOverallHealth() {
    const { score, total } = this.results.overall;
    const percentage = total > 0 ? (score / total) * 100 : 0;
    
    if (percentage >= 90) {
      this.results.overall.status = 'healthy';
      this.results.overall.color = 'green';
    } else if (percentage >= 70) {
      this.results.overall.status = 'degraded';
      this.results.overall.color = 'yellow';
    } else {
      this.results.overall.status = 'unhealthy';
      this.results.overall.color = 'red';
    }
    
    this.results.overall.percentage = Math.round(percentage);
  }

  generateReport() {
    this.calculateOverallHealth();
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      overall: this.results.overall,
      summary: {
        services: Object.keys(this.results.services).length,
        databases: Object.keys(this.results.databases).length,
        apis: Object.values(this.results.apis).reduce((acc, cat) => acc + Object.keys(cat).length, 0),
        monitoring: Object.keys(this.results.monitoring).length - 1 // exclude 'overall'
      },
      details: this.results
    };

    return report;
  }

  printReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🏥 LEARN-X SYSTEM HEALTH REPORT');
    console.log('='.repeat(80));
    
    const statusEmoji = {
      healthy: '🟢',
      degraded: '🟡', 
      unhealthy: '🔴',
      unknown: '⚪'
    };
    
    console.log(`\n📊 OVERALL SYSTEM STATUS: ${statusEmoji[report.overall.status]} ${report.overall.status.toUpperCase()}`);
    console.log(`📈 Health Score: ${report.overall.score}/${report.overall.total} (${report.overall.percentage}%)`);
    console.log(`⏱️  Test Duration: ${Math.round(report.duration / 1000)}s`);
    
    console.log('\n🔍 SERVICE CONNECTIVITY MATRIX:');
    console.log('┌─────────────────────┬──────────┬─────────────┐');
    console.log('│ Service             │ Status   │ Details     │');
    console.log('├─────────────────────┼──────────┼─────────────┤');
    
    Object.entries(report.details.services).forEach(([service, data]) => {
      const status = statusEmoji[data.overall] || '⚪';
      const testsCount = Object.keys(data.tests || {}).length;
      const passedTests = Object.values(data.tests || {}).filter(t => t.status === 'pass').length;
      const overallStatus = (data.overall || 'unknown').toString();
      console.log(`│ ${service.padEnd(19)} │ ${status} ${overallStatus.padEnd(6)} │ ${passedTests}/${testsCount} tests   │`);
    });
    
    console.log('└─────────────────────┴──────────┴─────────────┘');
    
    console.log('\n🗄️  DATABASE STATUS:');
    Object.entries(report.details.databases).forEach(([db, data]) => {
      const status = statusEmoji[data.status === 'pass' ? 'healthy' : 'unhealthy'];
      console.log(`   ${status} ${db}: ${data.status}`);
      if (data.error) console.log(`      Error: ${data.error}`);
    });
    
    console.log('\n🔄 CACHE STATUS:');
    Object.entries(report.details.cache).forEach(([cache, data]) => {
      const status = statusEmoji[data.status === 'pass' ? 'healthy' : 'unhealthy'];
      console.log(`   ${status} ${cache}: ${data.status}`);
      if (data.error) console.log(`      Error: ${data.error}`);
    });
    
    console.log('\n📬 QUEUE STATUS:');
    Object.entries(report.details.queues).forEach(([queue, data]) => {
      const status = statusEmoji[data.status === 'pass' ? 'healthy' : 'unhealthy'];
      console.log(`   ${status} ${queue}: ${data.status}`);
    });
    
    console.log('\n🌐 API ENDPOINTS:');
    Object.entries(report.details.apis).forEach(([category, endpoints]) => {
      console.log(`   📂 ${category.toUpperCase()}:`);
      Object.entries(endpoints).forEach(([name, data]) => {
        const status = statusEmoji[data.status === 'pass' ? 'healthy' : 'unhealthy'];
        console.log(`      ${status} ${name}: ${data.status} (HTTP ${data.httpStatus})`);
      });
    });
    
    console.log('\n📊 MONITORING:');
    Object.entries(report.details.monitoring).forEach(([system, data]) => {
      if (system === 'overall') return;
      const status = statusEmoji[data.status === 'pass' ? 'healthy' : 'unhealthy'];
      console.log(`   ${status} ${system}: ${data.status || (data.configExists === 'pass' ? 'configured' : 'not configured')}`);
    });
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (report.overall.percentage < 90) {
      console.log('   ⚠️  System health is below optimal. Review failed components above.');
    }
    if (report.details.services.pythonAI?.overall !== 'healthy') {
      console.log('   🧠 Python AI Service requires attention for AI features to work properly.');
    }
    if (report.details.databases.supabase?.status !== 'pass') {
      console.log('   🗄️  Database connectivity issues detected. Check Supabase configuration.');
    }
    if (report.details.cache.redis?.status !== 'pass') {
      console.log('   🔄 Redis cache issues detected. Performance may be impacted.');
    }
    
    console.log('\n' + '='.repeat(80));
  }

  async runFullHealthCheck() {
    console.log('🚀 Starting Comprehensive System Health Check...\n');
    
    try {
      await Promise.all([
        this.testBackendService(),
        this.testPythonAIService(),
        this.testSupabaseConnection(),
        this.testRedisConnection()
      ]);
      
      await this.testServiceCommunication();
      await this.testPGMQQueues();
      await this.testAPIEndpoints();
      await this.testFrontendHealth();
      await this.testMonitoringHealth();
      
      const report = this.generateReport();
      this.printReport(report);
      
      // Save report to file
      const reportPath = path.join(__dirname, '../tests/results/system-health-report.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      // Exit with appropriate code
      process.exit(report.overall.percentage >= 70 ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Health check failed with error:', error);
      process.exit(1);
    }
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new SystemHealthChecker();
  checker.runFullHealthCheck().catch(console.error);
}

module.exports = SystemHealthChecker;