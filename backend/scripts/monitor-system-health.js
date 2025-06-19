#!/usr/bin/env node

/**
 * LEARN-X System Health Monitor
 * Continuous monitoring script for production environments
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class SystemHealthMonitor {
  constructor() {
    this.config = {
      checkInterval: 30000, // 30 seconds
      alertThreshold: 3, // Failed checks before alert
      services: [
        { name: 'Backend', url: process.env.BACKEND_URL || 'http://localhost:3001/health', critical: true },
        { name: 'Python AI', url: process.env.PYTHON_AI_URL || 'http://localhost:8001/health', critical: true },
        { name: 'Redis', url: process.env.BACKEND_URL || 'http://localhost:3001/health/redis', critical: false }
      ]
    };
    
    this.state = {
      failureCounts: new Map(),
      lastSuccessful: new Map(),
      isRunning: false
    };
  }

  async checkService(service) {
    try {
      const response = await axios.get(service.url, { timeout: 10000 });
      return { success: true, status: response.status, responseTime: Date.now() % 1000 };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  }

  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 Health Check - ${timestamp}`);
    
    let allHealthy = true;
    const results = [];

    for (const service of this.config.services) {
      const result = await this.checkService(service);
      const serviceName = service.name;
      
      if (result.success) {
        console.log(`  🟢 ${serviceName}: OK (${result.status})`);
        this.state.failureCounts.set(serviceName, 0);
        this.state.lastSuccessful.set(serviceName, Date.now());
      } else {
        console.log(`  🔴 ${serviceName}: FAILED (${result.error})`);
        const currentFailures = this.state.failureCounts.get(serviceName) || 0;
        this.state.failureCounts.set(serviceName, currentFailures + 1);
        
        if (service.critical) allHealthy = false;
        
        // Check if we need to alert
        if (currentFailures >= this.config.alertThreshold) {
          await this.sendAlert(serviceName, result.error);
        }
      }
      
      results.push({ service: serviceName, ...result, critical: service.critical });
    }

    // Log overall status
    const overallStatus = allHealthy ? '🟢 HEALTHY' : '🔴 DEGRADED';
    console.log(`  Overall Status: ${overallStatus}`);
    
    // Save to monitoring log
    await this.logResults(timestamp, results, allHealthy);
    
    return { timestamp, results, healthy: allHealthy };
  }

  async sendAlert(serviceName, error) {
    const alertMessage = `🚨 ALERT: ${serviceName} has failed ${this.config.alertThreshold} consecutive health checks. Error: ${error}`;
    
    console.log(`\n${alertMessage}\n`);
    
    // In production, integrate with alerting systems:
    // - Slack webhook
    // - PagerDuty
    // - Email notifications
    // - SMS alerts
    
    // For now, just log to file
    await this.logAlert(alertMessage);
  }

  async logResults(timestamp, results, healthy) {
    const logEntry = {
      timestamp,
      healthy,
      results: results.map(r => ({
        service: r.service,
        success: r.success,
        critical: r.critical,
        error: r.error || null,
        responseTime: r.responseTime || null
      }))
    };

    const logPath = path.join(__dirname, '../logs/health-monitor.log');
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
  }

  async logAlert(message) {
    const alertPath = path.join(__dirname, '../logs/alerts.log');
    await fs.mkdir(path.dirname(alertPath), { recursive: true });
    await fs.appendFile(alertPath, `${new Date().toISOString()} - ${message}\n`);
  }

  async getHealthSummary() {
    const summary = {
      monitoringActive: this.state.isRunning,
      services: [],
      lastCheck: new Date().toISOString()
    };

    for (const service of this.config.services) {
      const failures = this.state.failureCounts.get(service.name) || 0;
      const lastSuccess = this.state.lastSuccessful.get(service.name);
      
      summary.services.push({
        name: service.name,
        status: failures === 0 ? 'healthy' : 'unhealthy',
        consecutiveFailures: failures,
        lastSuccessful: lastSuccess ? new Date(lastSuccess).toISOString() : null,
        critical: service.critical
      });
    }

    return summary;
  }

  async start() {
    console.log('🚀 Starting LEARN-X System Health Monitor');
    console.log(`📊 Check interval: ${this.config.checkInterval / 1000}s`);
    console.log(`⚠️  Alert threshold: ${this.config.alertThreshold} failures`);
    console.log('📝 Logs will be saved to ./logs/');
    
    this.state.isRunning = true;
    
    // Perform initial check
    await this.performHealthCheck();
    
    // Start periodic checks
    this.intervalId = setInterval(async () => {
      if (this.state.isRunning) {
        await this.performHealthCheck();
      }
    }, this.config.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop() {
    console.log('\n🛑 Stopping health monitor...');
    this.state.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    process.exit(0);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const monitor = new SystemHealthMonitor();
  
  switch (command) {
    case 'start':
      monitor.start();
      break;
      
    case 'check':
      monitor.performHealthCheck().then(() => process.exit(0));
      break;
      
    case 'summary':
      monitor.getHealthSummary().then(summary => {
        console.log(JSON.stringify(summary, null, 2));
        process.exit(0);
      });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node monitor-system-health.js start   - Start continuous monitoring');
      console.log('  node monitor-system-health.js check   - Perform single health check');
      console.log('  node monitor-system-health.js summary - Show current status summary');
      process.exit(1);
  }
}

module.exports = SystemHealthMonitor;