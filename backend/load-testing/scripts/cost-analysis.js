/**
 * Supabase Cost Analysis and Projection Tool
 * Analyzes current usage patterns and projects future costs
 */

const fs = require('fs');
const path = require('path');

// Supabase pricing (as of 2024)
const PRICING = {
  free: {
    monthly_cost: 0,
    database_size_gb: 0.5,
    storage_gb: 1,
    bandwidth_gb: 2,
    api_requests: 500000,
    edge_functions: 500000,
    realtime_connections: 200,
    realtime_messages: 2000000,
  },
  pro: {
    monthly_cost: 25,
    database_size_gb: 8,
    storage_gb: 100,
    bandwidth_gb: 200,
    api_requests: 5000000,
    edge_functions: 2000000,
    realtime_connections: 500,
    realtime_messages: 5000000,
    // Overage costs (per unit)
    storage_gb_overage: 0.125, // per GB
    bandwidth_gb_overage: 0.09, // per GB
    edge_function_overage: 2, // per 1M requests
  },
  team: {
    monthly_cost: 599,
    database_size_gb: 128,
    storage_gb: 200,
    bandwidth_gb: 500,
    api_requests: 10000000,
    edge_functions: 10000000,
    realtime_connections: 1000,
    realtime_messages: 10000000,
    // Lower overage costs
    storage_gb_overage: 0.10,
    bandwidth_gb_overage: 0.07,
    edge_function_overage: 1.5,
  },
};

class CostAnalyzer {
  constructor() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
  }

  // Read monitoring data from previous runs
  loadMonitoringData() {
    const resultsDir = path.join(__dirname, '../results');
    const files = fs.readdirSync(resultsDir)
      .filter(f => f.startsWith('supabase-monitoring-') && f.endsWith('.json'))
      .sort()
      .slice(-30); // Last 30 reports

    return files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
      return {
        timestamp: new Date(data.timestamp),
        usage: data.usage,
        plan: data.plan,
      };
    });
  }

  // Analyze usage trends
  analyzeUsageTrends(monitoringData) {
    if (monitoringData.length < 2) {
      return { error: 'Insufficient data for trend analysis' };
    }

    const latest = monitoringData[monitoringData.length - 1];
    const previous = monitoringData[0];
    const daysDiff = (latest.timestamp - previous.timestamp) / (1000 * 60 * 60 * 24);

    const trends = {
      database_growth_mb_per_day: 0,
      storage_growth_gb_per_day: 0,
      connection_trend: 'stable',
      performance_trend: 'stable',
      projection_confidence: 'low',
    };

    // Database growth trend
    if (latest.usage.database && previous.usage.database && 
        !latest.usage.database.error && !previous.usage.database.error) {
      const dbGrowth = latest.usage.database.current_mb - previous.usage.database.current_mb;
      trends.database_growth_mb_per_day = dbGrowth / daysDiff;
    }

    // Storage growth trend  
    if (latest.usage.storage && previous.usage.storage &&
        !latest.usage.storage.error && !previous.usage.storage.error) {
      const storageGrowth = latest.usage.storage.current_gb - previous.usage.storage.current_gb;
      trends.storage_growth_gb_per_day = storageGrowth / daysDiff;
    }

    // Connection trend
    if (latest.usage.connections && previous.usage.connections &&
        !latest.usage.connections.error && !previous.usage.connections.error) {
      const connChange = latest.usage.connections.current_connections - previous.usage.connections.current_connections;
      const changePercent = Math.abs(connChange) / previous.usage.connections.current_connections * 100;
      
      if (changePercent > 20) {
        trends.connection_trend = connChange > 0 ? 'increasing' : 'decreasing';
      }
    }

    // Set confidence based on data points
    if (monitoringData.length >= 7) trends.projection_confidence = 'high';
    else if (monitoringData.length >= 3) trends.projection_confidence = 'medium';

    return trends;
  }

  // Project future usage
  projectFutureUsage(currentUsage, trends, monthsAhead = 3) {
    const daysAhead = monthsAhead * 30;
    
    const projections = {
      database_mb: currentUsage.database?.current_mb || 0,
      storage_gb: currentUsage.storage?.current_gb || 0,
      connections_avg: currentUsage.connections?.current_connections || 0,
      confidence: trends.projection_confidence,
    };

    // Project database growth
    if (trends.database_growth_mb_per_day > 0) {
      projections.database_mb += trends.database_growth_mb_per_day * daysAhead;
    }

    // Project storage growth
    if (trends.storage_growth_gb_per_day > 0) {
      projections.storage_gb += trends.storage_growth_gb_per_day * daysAhead;
    }

    // Estimate API requests (simplified - would need actual API logs)
    // Assume linear relationship with database growth for now
    const apiGrowthFactor = Math.max(1, 1 + (trends.database_growth_mb_per_day * 30 / 1000));
    projections.estimated_api_requests_monthly = 100000 * apiGrowthFactor; // Base estimate

    return projections;
  }

  // Calculate costs for different plans
  calculateCosts(usage, plan = 'pro') {
    const pricing = PRICING[plan];
    if (!pricing) {
      throw new Error(`Unknown plan: ${plan}`);
    }

    const costs = {
      base_cost: pricing.monthly_cost,
      overage_costs: {},
      total_monthly_cost: pricing.monthly_cost,
      cost_breakdown: [],
    };

    // Storage overage
    if (usage.storage_gb > pricing.storage_gb && pricing.storage_gb_overage) {
      const overage = usage.storage_gb - pricing.storage_gb;
      costs.overage_costs.storage = overage * pricing.storage_gb_overage;
      costs.cost_breakdown.push({
        item: 'Storage overage',
        amount: overage,
        unit: 'GB',
        rate: pricing.storage_gb_overage,
        cost: costs.overage_costs.storage,
      });
    }

    // Database size overage (if applicable)
    if (usage.database_mb > pricing.database_size_gb * 1024) {
      costs.cost_breakdown.push({
        item: 'Database size limit exceeded',
        warning: 'Plan upgrade required',
        current: `${usage.database_mb}MB`,
        limit: `${pricing.database_size_gb}GB`,
      });
    }

    // Bandwidth overage (estimated)
    if (usage.estimated_bandwidth_gb > pricing.bandwidth_gb && pricing.bandwidth_gb_overage) {
      const overage = usage.estimated_bandwidth_gb - pricing.bandwidth_gb;
      costs.overage_costs.bandwidth = overage * pricing.bandwidth_gb_overage;
      costs.cost_breakdown.push({
        item: 'Bandwidth overage',
        amount: overage,
        unit: 'GB',
        rate: pricing.bandwidth_gb_overage,
        cost: costs.overage_costs.bandwidth,
      });
    }

    // Calculate total
    const totalOverage = Object.values(costs.overage_costs).reduce((sum, cost) => sum + cost, 0);
    costs.total_monthly_cost = pricing.monthly_cost + totalOverage;

    return costs;
  }

  // Compare plans and recommend best option
  comparePlans(projectedUsage) {
    const plans = ['free', 'pro', 'team'];
    const comparison = [];

    for (const plan of plans) {
      try {
        const costs = this.calculateCosts(projectedUsage, plan);
        const pricing = PRICING[plan];
        
        // Check if usage fits within plan limits
        const fits = {
          database: (projectedUsage.database_mb / 1024) <= pricing.database_size_gb,
          storage: projectedUsage.storage_gb <= pricing.storage_gb,
          api_requests: (projectedUsage.estimated_api_requests_monthly || 0) <= pricing.api_requests,
        };

        const fitsAll = Object.values(fits).every(Boolean);
        
        comparison.push({
          plan,
          monthly_cost: costs.total_monthly_cost,
          fits_limits: fitsAll,
          overage_costs: costs.overage_costs,
          cost_breakdown: costs.cost_breakdown,
          limitations: Object.entries(fits)
            .filter(([key, value]) => !value)
            .map(([key]) => key),
        });
      } catch (error) {
        comparison.push({
          plan,
          error: error.message,
        });
      }
    }

    // Find recommended plan
    const validPlans = comparison.filter(p => p.fits_limits && !p.error);
    const recommended = validPlans.length > 0 
      ? validPlans.reduce((best, current) => 
          current.monthly_cost < best.monthly_cost ? current : best
        )
      : comparison.find(p => p.plan === 'team'); // Fallback to highest tier

    return {
      comparison,
      recommended: recommended?.plan || 'team',
      estimated_savings: this.calculateSavings(comparison),
    };
  }

  calculateSavings(comparison) {
    const current = comparison.find(p => p.plan === 'pro'); // Assume currently on Pro
    const recommended = comparison.find(p => p.fits_limits);
    
    if (!current || !recommended || current.plan === recommended.plan) {
      return null;
    }

    return {
      monthly_savings: current.monthly_cost - recommended.monthly_cost,
      annual_savings: (current.monthly_cost - recommended.monthly_cost) * 12,
      direction: current.monthly_cost > recommended.monthly_cost ? 'downgrade' : 'upgrade',
    };
  }

  // Generate optimization recommendations
  generateOptimizations(currentUsage, trends) {
    const recommendations = [];

    // Database optimizations
    if (trends.database_growth_mb_per_day > 50) {
      recommendations.push({
        category: 'Database',
        priority: 'high',
        title: 'High database growth detected',
        description: 'Database growing by ' + trends.database_growth_mb_per_day.toFixed(1) + 'MB/day',
        actions: [
          'Review data retention policies',
          'Archive old records',
          'Optimize large tables',
          'Consider data compression',
        ],
        potential_savings: 'Up to 30% storage reduction',
      });
    }

    // Storage optimizations
    if (trends.storage_growth_gb_per_day > 1) {
      recommendations.push({
        category: 'Storage',
        priority: 'medium',
        title: 'High storage growth',
        description: 'Storage growing by ' + trends.storage_growth_gb_per_day.toFixed(2) + 'GB/day',
        actions: [
          'Clean up unused files',
          'Implement file compression',
          'Set up automatic cleanup policies',
          'Use CDN for static assets',
        ],
        potential_savings: '$5-20/month in overage costs',
      });
    }

    // Connection optimizations
    if (currentUsage.connections?.usage_percentage > 70) {
      recommendations.push({
        category: 'Connections',
        priority: 'high',
        title: 'High connection usage',
        description: `Using ${currentUsage.connections.usage_percentage.toFixed(1)}% of connection limit`,
        actions: [
          'Implement connection pooling (PgBouncer)',
          'Optimize connection management in application',
          'Review and close idle connections',
          'Consider read replicas for read-heavy workloads',
        ],
        potential_savings: 'Avoid plan upgrade ($574/month)',
      });
    }

    // Performance optimizations
    if (currentUsage.performance?.performance_score < 70) {
      recommendations.push({
        category: 'Performance',
        priority: 'medium',
        title: 'Performance optimization opportunities',
        description: `Performance score: ${currentUsage.performance.performance_score}/100`,
        actions: [
          'Add missing database indexes',
          'Optimize slow queries',
          'Review and update table statistics',
          'Consider query caching',
        ],
        potential_savings: 'Improved user experience, reduced resource usage',
      });
    }

    return recommendations;
  }

  // Main analysis function
  async analyze() {
    console.log('💰 Starting Supabase cost analysis...\n');

    // Load historical data
    const monitoringData = this.loadMonitoringData();
    if (monitoringData.length === 0) {
      throw new Error('No monitoring data found. Run supabase-monitor.js first.');
    }

    const latestData = monitoringData[monitoringData.length - 1];
    const currentUsage = latestData.usage;

    // Analyze trends
    const trends = this.analyzeUsageTrends(monitoringData);

    // Project future usage
    const futureUsage = this.projectFutureUsage(currentUsage, trends, 3);

    // Compare plans
    const planComparison = this.comparePlans(futureUsage);

    // Generate optimizations
    const optimizations = this.generateOptimizations(currentUsage, trends);

    // Compile report
    const report = {
      timestamp: new Date().toISOString(),
      current_plan: latestData.plan,
      analysis_period_days: monitoringData.length > 1 
        ? Math.round((latestData.timestamp - monitoringData[0].timestamp) / (1000 * 60 * 60 * 24))
        : 0,
      current_usage: currentUsage,
      usage_trends: trends,
      projections: {
        months_ahead: 3,
        projected_usage: futureUsage,
        confidence: trends.projection_confidence,
      },
      cost_analysis: planComparison,
      optimizations: optimizations,
      summary: this.generateSummary(planComparison, optimizations, trends),
    };

    return report;
  }

  generateSummary(planComparison, optimizations, trends) {
    const recommended = planComparison.comparison.find(p => p.plan === planComparison.recommended);
    const highPriorityOptimizations = optimizations.filter(o => o.priority === 'high').length;

    return {
      recommended_plan: planComparison.recommended,
      estimated_monthly_cost: recommended?.monthly_cost || 0,
      potential_monthly_savings: planComparison.estimated_savings?.monthly_savings || 0,
      high_priority_optimizations: highPriorityOptimizations,
      growth_rate: {
        database_mb_per_month: trends.database_growth_mb_per_day * 30,
        storage_gb_per_month: trends.storage_growth_gb_per_day * 30,
      },
      action_required: highPriorityOptimizations > 0 || (recommended?.limitations?.length > 0),
    };
  }
}

// CLI interface
async function main() {
  const analyzer = new CostAnalyzer();
  
  try {
    const report = await analyzer.analyze();
    
    // Save report
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `cost-analysis-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('='.repeat(60));
    console.log('💰 SUPABASE COST ANALYSIS REPORT');
    console.log('='.repeat(60));
    console.log(`Current Plan: ${report.current_plan.toUpperCase()}`);
    console.log(`Recommended Plan: ${report.summary.recommended_plan.toUpperCase()}`);
    console.log(`Estimated Monthly Cost: $${report.summary.estimated_monthly_cost.toFixed(2)}`);
    
    if (report.summary.potential_monthly_savings > 0) {
      console.log(`💚 Potential Monthly Savings: $${report.summary.potential_monthly_savings.toFixed(2)}`);
    } else if (report.summary.potential_monthly_savings < 0) {
      console.log(`📈 Additional Monthly Cost: $${Math.abs(report.summary.potential_monthly_savings).toFixed(2)}`);
    }
    
    // Growth trends
    console.log('\n📈 Growth Trends:');
    console.log(`  Database: +${report.summary.growth_rate.database_mb_per_month.toFixed(1)}MB/month`);
    console.log(`  Storage: +${report.summary.growth_rate.storage_gb_per_month.toFixed(2)}GB/month`);
    
    // Plan comparison
    console.log('\n📋 Plan Comparison:');
    report.cost_analysis.comparison.forEach(plan => {
      if (!plan.error) {
        const fits = plan.fits_limits ? '✅' : '❌';
        console.log(`  ${plan.plan.toUpperCase()}: $${plan.monthly_cost.toFixed(2)}/month ${fits}`);
      }
    });
    
    // High priority optimizations
    if (report.summary.high_priority_optimizations > 0) {
      console.log(`\n⚠️  ${report.summary.high_priority_optimizations} high-priority optimizations available`);
      report.optimizations
        .filter(opt => opt.priority === 'high')
        .forEach(opt => {
          console.log(`  - ${opt.title}: ${opt.potential_savings}`);
        });
    }
    
    // Action required
    if (report.summary.action_required) {
      console.log('\n🚨 Action Required:');
      if (report.summary.high_priority_optimizations > 0) {
        console.log('  - Review and implement high-priority optimizations');
      }
      const recommended = report.cost_analysis.comparison.find(p => p.plan === report.cost_analysis.recommended);
      if (recommended?.limitations?.length > 0) {
        console.log('  - Consider plan upgrade due to resource constraints');
      }
    }
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error running cost analysis:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { CostAnalyzer };