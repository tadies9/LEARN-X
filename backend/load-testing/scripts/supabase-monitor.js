/**
 * Supabase Resource Monitoring and Plan Validation
 * Monitors database usage, storage, and performance metrics
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection (reads from environment)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase plan limits (updated for current pricing)
const PLAN_LIMITS = {
  free: {
    database_size_mb: 500,
    storage_gb: 1,
    bandwidth_gb: 2,
    concurrent_connections: 60,
    api_requests_monthly: 500000,
    edge_functions_monthly: 500000,
    realtime_peak_connections: 200,
    realtime_messages_monthly: 2000000,
  },
  pro: {
    database_size_mb: 8192, // 8GB
    storage_gb: 100,
    bandwidth_gb: 200,
    concurrent_connections: 200,
    api_requests_monthly: 5000000,
    edge_functions_monthly: 2000000,
    realtime_peak_connections: 500,
    realtime_messages_monthly: 5000000,
  },
  team: {
    database_size_mb: 134217728, // 128GB
    storage_gb: 200,
    bandwidth_gb: 500,
    concurrent_connections: 400,
    api_requests_monthly: 10000000,
    edge_functions_monthly: 10000000,
    realtime_peak_connections: 1000,
    realtime_messages_monthly: 10000000,
  },
};

class SupabaseMonitor {
  constructor() {
    this.currentPlan = process.env.SUPABASE_PLAN || 'free';
    this.limits = PLAN_LIMITS[this.currentPlan];
    this.warnings = [];
    this.recommendations = [];
  }

  async checkDatabaseSize() {
    console.log('📊 Checking database size...');
    
    try {
      // Get total database size
      const { data: dbSize } = await supabase.rpc('get_database_size');
      const sizeMB = dbSize ? Math.round(dbSize / 1024 / 1024) : 0;
      
      // Get individual table sizes
      const { data: tableSizes } = await supabase.rpc('get_table_sizes');
      
      const usage = {
        current_mb: sizeMB,
        limit_mb: this.limits.database_size_mb,
        usage_percentage: (sizeMB / this.limits.database_size_mb) * 100,
        largest_tables: tableSizes?.slice(0, 10) || [],
      };
      
      // Warning thresholds
      if (usage.usage_percentage > 90) {
        this.warnings.push({
          type: 'CRITICAL',
          component: 'database_size',
          message: `Database size at ${usage.usage_percentage.toFixed(1)}% of limit`,
          current: `${sizeMB}MB`,
          limit: `${this.limits.database_size_mb}MB`,
        });
        this.recommendations.push('Consider upgrading plan or archiving old data');
      } else if (usage.usage_percentage > 75) {
        this.warnings.push({
          type: 'WARNING',
          component: 'database_size',
          message: `Database size at ${usage.usage_percentage.toFixed(1)}% of limit`,
          current: `${sizeMB}MB`,
          limit: `${this.limits.database_size_mb}MB`,
        });
      }
      
      return usage;
    } catch (error) {
      console.error('Error checking database size:', error.message);
      return { error: error.message };
    }
  }

  async checkConnectionUsage() {
    console.log('🔗 Checking database connections...');
    
    try {
      const { data: connections } = await supabase.rpc('get_current_connections');
      const activeConnections = connections?.length || 0;
      
      // Get connection breakdown by application
      const { data: connectionStats } = await supabase.rpc('get_connection_stats');
      
      const usage = {
        current_connections: activeConnections,
        limit_connections: this.limits.concurrent_connections,
        usage_percentage: (activeConnections / this.limits.concurrent_connections) * 100,
        connection_breakdown: connectionStats || [],
      };
      
      if (usage.usage_percentage > 85) {
        this.warnings.push({
          type: 'CRITICAL',
          component: 'connections',
          message: `Connection usage at ${usage.usage_percentage.toFixed(1)}%`,
          current: activeConnections,
          limit: this.limits.concurrent_connections,
        });
        this.recommendations.push('Implement connection pooling or upgrade plan');
      } else if (usage.usage_percentage > 70) {
        this.warnings.push({
          type: 'WARNING',
          component: 'connections',
          message: `Connection usage at ${usage.usage_percentage.toFixed(1)}%`,
          current: activeConnections,
          limit: this.limits.concurrent_connections,
        });
      }
      
      return usage;
    } catch (error) {
      console.error('Error checking connections:', error.message);
      return { error: error.message };
    }
  }

  async checkStorageUsage() {
    console.log('💾 Checking storage usage...');
    
    try {
      // Get storage bucket sizes
      const { data: buckets } = await supabase.storage.listBuckets();
      let totalSizeBytes = 0;
      const bucketSizes = [];
      
      for (const bucket of buckets || []) {
        try {
          const { data: files } = await supabase.storage.from(bucket.name).list('', {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          });
          
          const bucketSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
          totalSizeBytes += bucketSize;
          bucketSizes.push({
            name: bucket.name,
            size_bytes: bucketSize,
            size_mb: Math.round(bucketSize / 1024 / 1024),
            file_count: files?.length || 0,
          });
        } catch (bucketError) {
          console.warn(`Could not get size for bucket ${bucket.name}:`, bucketError.message);
        }
      }
      
      const totalSizeGB = totalSizeBytes / 1024 / 1024 / 1024;
      
      const usage = {
        current_gb: totalSizeGB,
        limit_gb: this.limits.storage_gb,
        usage_percentage: (totalSizeGB / this.limits.storage_gb) * 100,
        bucket_breakdown: bucketSizes,
      };
      
      if (usage.usage_percentage > 90) {
        this.warnings.push({
          type: 'CRITICAL',
          component: 'storage',
          message: `Storage usage at ${usage.usage_percentage.toFixed(1)}%`,
          current: `${totalSizeGB.toFixed(2)}GB`,
          limit: `${this.limits.storage_gb}GB`,
        });
        this.recommendations.push('Clean up old files or upgrade storage plan');
      } else if (usage.usage_percentage > 75) {
        this.warnings.push({
          type: 'WARNING',
          component: 'storage',
          message: `Storage usage at ${usage.usage_percentage.toFixed(1)}%`,
          current: `${totalSizeGB.toFixed(2)}GB`,
          limit: `${this.limits.storage_gb}GB`,
        });
      }
      
      return usage;
    } catch (error) {
      console.error('Error checking storage usage:', error.message);
      return { error: error.message };
    }
  }

  async checkIndexUsage() {
    console.log('📈 Checking index performance...');
    
    try {
      const { data: indexStats } = await supabase.rpc('get_index_usage_stats');
      const { data: unusedIndexes } = await supabase.rpc('get_unused_indexes');
      const { data: missingIndexes } = await supabase.rpc('get_suggested_indexes');
      
      const analysis = {
        total_indexes: indexStats?.length || 0,
        unused_indexes: unusedIndexes?.length || 0,
        suggested_indexes: missingIndexes?.length || 0,
        index_hit_ratio: this.calculateIndexHitRatio(indexStats),
        performance_issues: [],
      };
      
      // Check for performance issues
      if (analysis.index_hit_ratio < 0.95) {
        this.warnings.push({
          type: 'WARNING',
          component: 'indexes',
          message: `Low index hit ratio: ${(analysis.index_hit_ratio * 100).toFixed(1)}%`,
          recommendation: 'Review query patterns and add missing indexes',
        });
      }
      
      if (analysis.unused_indexes > 5) {
        this.recommendations.push(`Remove ${analysis.unused_indexes} unused indexes to improve write performance`);
      }
      
      if (analysis.suggested_indexes > 0) {
        this.recommendations.push(`Consider adding ${analysis.suggested_indexes} suggested indexes for better performance`);
      }
      
      return analysis;
    } catch (error) {
      console.error('Error checking index usage:', error.message);
      return { error: error.message };
    }
  }

  async checkPerformanceMetrics() {
    console.log('⚡ Checking performance metrics...');
    
    try {
      const { data: slowQueries } = await supabase.rpc('get_slow_queries', { min_duration: 1000 });
      const { data: lockStats } = await supabase.rpc('get_lock_stats');
      const { data: cacheStats } = await supabase.rpc('get_cache_hit_ratio');
      
      const metrics = {
        slow_queries_count: slowQueries?.length || 0,
        avg_query_time: this.calculateAverageQueryTime(slowQueries),
        cache_hit_ratio: cacheStats?.[0]?.ratio || 0,
        lock_waits: lockStats?.reduce((sum, stat) => sum + stat.waits, 0) || 0,
        performance_score: 0,
      };
      
      // Calculate performance score (0-100)
      let score = 100;
      if (metrics.cache_hit_ratio < 0.95) score -= 20;
      if (metrics.avg_query_time > 500) score -= 20;
      if (metrics.slow_queries_count > 10) score -= 15;
      if (metrics.lock_waits > 100) score -= 10;
      
      metrics.performance_score = Math.max(0, score);
      
      if (metrics.performance_score < 70) {
        this.warnings.push({
          type: 'WARNING',
          component: 'performance',
          message: `Low performance score: ${metrics.performance_score}/100`,
          details: {
            cache_hit_ratio: metrics.cache_hit_ratio,
            avg_query_time: metrics.avg_query_time,
            slow_queries: metrics.slow_queries_count,
          },
        });
      }
      
      return metrics;
    } catch (error) {
      console.error('Error checking performance metrics:', error.message);
      return { error: error.message };
    }
  }

  async generateReport() {
    console.log('🚀 Starting Supabase monitoring check...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      plan: this.currentPlan,
      limits: this.limits,
      usage: {},
      warnings: [],
      recommendations: [],
      summary: {},
    };
    
    // Run all checks
    report.usage.database = await this.checkDatabaseSize();
    report.usage.connections = await this.checkConnectionUsage();
    report.usage.storage = await this.checkStorageUsage();
    report.usage.indexes = await this.checkIndexUsage();
    report.usage.performance = await this.checkPerformanceMetrics();
    
    // Compile warnings and recommendations
    report.warnings = this.warnings;
    report.recommendations = this.recommendations;
    
    // Generate summary
    report.summary = this.generateSummary(report);
    
    return report;
  }

  generateSummary(report) {
    const critical = report.warnings.filter(w => w.type === 'CRITICAL').length;
    const warnings = report.warnings.filter(w => w.type === 'WARNING').length;
    
    let status = 'HEALTHY';
    if (critical > 0) status = 'CRITICAL';
    else if (warnings > 0) status = 'WARNING';
    
    return {
      status,
      critical_issues: critical,
      warnings: warnings,
      recommendations_count: report.recommendations.length,
      overall_health_score: this.calculateOverallHealth(report),
      plan_recommendation: this.getPlanRecommendation(report),
    };
  }

  calculateOverallHealth(report) {
    let score = 100;
    
    // Database size impact
    const dbUsage = report.usage.database?.usage_percentage || 0;
    if (dbUsage > 90) score -= 30;
    else if (dbUsage > 75) score -= 15;
    
    // Connection usage impact
    const connUsage = report.usage.connections?.usage_percentage || 0;
    if (connUsage > 85) score -= 25;
    else if (connUsage > 70) score -= 10;
    
    // Storage impact
    const storageUsage = report.usage.storage?.usage_percentage || 0;
    if (storageUsage > 90) score -= 20;
    else if (storageUsage > 75) score -= 10;
    
    // Performance impact
    const perfScore = report.usage.performance?.performance_score || 100;
    if (perfScore < 70) score -= (100 - perfScore) * 0.2;
    
    return Math.max(0, Math.round(score));
  }

  getPlanRecommendation(report) {
    const dbUsage = report.usage.database?.usage_percentage || 0;
    const connUsage = report.usage.connections?.usage_percentage || 0;
    const storageUsage = report.usage.storage?.usage_percentage || 0;
    
    if (this.currentPlan === 'free') {
      if (dbUsage > 75 || connUsage > 70 || storageUsage > 75) {
        return {
          recommended_plan: 'pro',
          reason: 'Approaching free tier limits',
          benefits: ['8GB database', '200 connections', '100GB storage', 'Better performance'],
          estimated_cost: '$25/month',
        };
      }
    }
    
    if (this.currentPlan === 'pro') {
      if (dbUsage > 75 || connUsage > 70) {
        return {
          recommended_plan: 'team',
          reason: 'High resource usage on Pro plan',
          benefits: ['128GB database', '400 connections', 'Dedicated resources'],
          estimated_cost: '$599/month',
        };
      }
    }
    
    return {
      recommended_plan: this.currentPlan,
      reason: 'Current plan is sufficient',
      action: 'Continue monitoring',
    };
  }

  calculateIndexHitRatio(indexStats) {
    if (!indexStats || indexStats.length === 0) return 0;
    
    const totalReads = indexStats.reduce((sum, stat) => sum + (stat.idx_scan || 0), 0);
    const totalHits = indexStats.reduce((sum, stat) => sum + (stat.idx_tup_read || 0), 0);
    
    return totalReads > 0 ? totalHits / totalReads : 0;
  }

  calculateAverageQueryTime(slowQueries) {
    if (!slowQueries || slowQueries.length === 0) return 0;
    
    const totalTime = slowQueries.reduce((sum, query) => sum + query.mean_exec_time, 0);
    return totalTime / slowQueries.length;
  }
}

// CLI interface
async function main() {
  const monitor = new SupabaseMonitor();
  
  try {
    const report = await monitor.generateReport();
    
    // Save report to file
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `supabase-monitoring-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUPABASE MONITORING REPORT');
    console.log('='.repeat(60));
    console.log(`Status: ${report.summary.status}`);
    console.log(`Overall Health Score: ${report.summary.overall_health_score}/100`);
    console.log(`Current Plan: ${report.plan.toUpperCase()}`);
    console.log(`Critical Issues: ${report.summary.critical_issues}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    console.log(`Recommendations: ${report.summary.recommendations_count}`);
    
    // Show usage breakdown
    console.log('\n📈 Resource Usage:');
    if (report.usage.database && !report.usage.database.error) {
      console.log(`  Database: ${report.usage.database.current_mb}MB / ${report.usage.database.limit_mb}MB (${report.usage.database.usage_percentage.toFixed(1)}%)`);
    }
    if (report.usage.connections && !report.usage.connections.error) {
      console.log(`  Connections: ${report.usage.connections.current_connections} / ${report.usage.connections.limit_connections} (${report.usage.connections.usage_percentage.toFixed(1)}%)`);
    }
    if (report.usage.storage && !report.usage.storage.error) {
      console.log(`  Storage: ${report.usage.storage.current_gb.toFixed(2)}GB / ${report.usage.storage.limit_gb}GB (${report.usage.storage.usage_percentage.toFixed(1)}%)`);
    }
    
    // Show warnings
    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.warnings.forEach(warning => {
        console.log(`  - ${warning.type}: ${warning.message}`);
      });
    }
    
    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
    
    // Plan recommendation
    const planRec = report.summary.plan_recommendation;
    if (planRec.recommended_plan !== monitor.currentPlan) {
      console.log('\n📋 Plan Recommendation:');
      console.log(`  Recommended: ${planRec.recommended_plan.toUpperCase()}`);
      console.log(`  Reason: ${planRec.reason}`);
      if (planRec.estimated_cost) {
        console.log(`  Estimated Cost: ${planRec.estimated_cost}`);
      }
    }
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    if (report.summary.critical_issues > 0) {
      process.exit(1);
    } else if (report.summary.warnings > 0) {
      process.exit(2);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error running Supabase monitoring:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SupabaseMonitor };