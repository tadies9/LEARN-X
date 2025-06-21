import { getEnhancedAICache } from '../../services/cache/EnhancedAICache';
import { CostTracker } from '../../services/ai/CostTracker';
import { cacheWarmingService } from '../../services/cache/CacheWarmingService';
import { redisClient } from '../../config/redis';

export interface ValidationResults {
  cacheEffectiveness: {
    hitRate: number;
    targetHitRate: number;
    passed: boolean;
  };
  costAccuracy: {
    trackedCorrectly: boolean;
    estimatedSavings: number;
    actualSavings: number;
    accuracy: number;
  };
  performanceMetrics: {
    responseTimeImprovement: number;
    memoryEfficiency: boolean;
    scalabilityScore: number;
  };
  personalizationEffectiveness: {
    personalizedHitRate: number;
    genericHitRate: number;
    personalizationBenefit: number;
  };
  overallScore: number;
  recommendations: string[];
}

export class ReportGenerator {
  private cache = getEnhancedAICache(redisClient, new CostTracker());

  calculateOverallScore(metrics: any): {
    overallScore: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 0;

    // Cache effectiveness (30 points)
    if (metrics.cacheEffectiveness.passed) {
      score += 30;
    } else {
      score += metrics.cacheEffectiveness.hitRate * 30;
      recommendations.push(
        `Improve cache hit rate from ${(metrics.cacheEffectiveness.hitRate * 100).toFixed(1)}% to ${(metrics.cacheEffectiveness.targetHitRate * 100).toFixed(1)}%`
      );
    }

    // Cost accuracy (25 points)
    score += metrics.costAccuracy.accuracy * 25;
    if (metrics.costAccuracy.accuracy < 0.9) {
      recommendations.push(
        `Improve cost tracking accuracy (currently ${(metrics.costAccuracy.accuracy * 100).toFixed(1)}%)`
      );
    }

    // Performance metrics (25 points)
    score += Math.min(metrics.performanceMetrics.scalabilityScore * 0.25, 25);
    if (!metrics.performanceMetrics.memoryEfficiency) {
      recommendations.push('Optimize memory usage for better efficiency');
    }

    // Personalization effectiveness (20 points)
    const personalizationScore = Math.max(
      0,
      metrics.personalizationEffectiveness.personalizationBenefit * 100
    );
    score += Math.min(personalizationScore, 20);
    if (metrics.personalizationEffectiveness.personalizationBenefit < 0.1) {
      recommendations.push('Enhance personalization effectiveness for better cache utilization');
    }

    // Add general recommendations based on score
    if (score < 70) {
      recommendations.push('Consider implementing cache warming for popular content');
      recommendations.push('Review TTL configurations for better hit rates');
    }

    if (score >= 90) {
      recommendations.push(
        'Excellent cache performance! Consider advanced optimizations like predictive caching'
      );
    }

    return { overallScore: score, recommendations };
  }

  async generateDetailedReport(results: ValidationResults): Promise<string> {
    const detailedMetrics = await this.cache.getDetailedMetrics();
    const warmingStats = await cacheWarmingService.getWarmingStats();

    return `
# Cache Effectiveness Validation Report

## Executive Summary
- **Overall Score**: ${results.overallScore.toFixed(1)}/100
- **Cache Hit Rate**: ${(results.cacheEffectiveness.hitRate * 100).toFixed(1)}%
- **Cost Tracking Accuracy**: ${(results.costAccuracy.accuracy * 100).toFixed(1)}%
- **Response Time Improvement**: ${results.performanceMetrics.responseTimeImprovement.toFixed(1)}%

## Detailed Metrics

### Cache Performance
- Hit Rate: ${(results.cacheEffectiveness.hitRate * 100).toFixed(1)}% (Target: ${(results.cacheEffectiveness.targetHitRate * 100).toFixed(1)}%)
- Total Keys: ${detailedMetrics.totalKeys}
- Memory Usage: ${detailedMetrics.memoryUsage}
- Memory Efficient: ${results.performanceMetrics.memoryEfficiency ? 'Yes' : 'No'}

### Cost Tracking
- Estimated Savings: $${results.costAccuracy.estimatedSavings.toFixed(3)}
- Actual Savings: $${results.costAccuracy.actualSavings.toFixed(3)}
- Tracking Accuracy: ${(results.costAccuracy.accuracy * 100).toFixed(1)}%

### Personalization
- Personalized Hit Rate: ${(results.personalizationEffectiveness.personalizedHitRate * 100).toFixed(1)}%
- Generic Hit Rate: ${(results.personalizationEffectiveness.genericHitRate * 100).toFixed(1)}%
- Personalization Benefit: ${(results.personalizationEffectiveness.personalizationBenefit * 100).toFixed(1)}%

### Cache Warming
- Queue Size: ${warmingStats.queueSize}
- Active: ${warmingStats.isActive ? 'Yes' : 'No'}
- Success Rate: ${(warmingStats.successRate * 100).toFixed(1)}%

## Recommendations
${results.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Service Distribution
${Object.entries(detailedMetrics.keyDistribution)
  .map(([service, count]) => `- ${service}: ${count} keys`)
  .join('\n')}

---
Generated: ${new Date().toISOString()}
`;
  }
}