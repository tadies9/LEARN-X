import { CostTracker } from '../services/ai/CostTracker';
import { logger } from '../utils/logger';
import { CacheEffectivenessTests } from './cache-effectiveness/CacheEffectivenessTests';
import { CostTrackingValidator } from './cache-effectiveness/CostTrackingValidator';
import { PerformanceMetricsAnalyzer } from './cache-effectiveness/PerformanceMetricsAnalyzer';
import { ReportGenerator, ValidationResults } from './cache-effectiveness/ReportGenerator';

/**
 * Comprehensive cache effectiveness validation
 */
class CacheEffectivenessValidator {
  private costTracker = new CostTracker();
  private cacheTests = new CacheEffectivenessTests();
  private costValidator = new CostTrackingValidator(this.costTracker);
  private performanceAnalyzer = new PerformanceMetricsAnalyzer();
  private reportGenerator = new ReportGenerator();

  /**
   * Run comprehensive validation tests
   */
  async runValidation(): Promise<ValidationResults> {
    logger.info('Starting comprehensive cache effectiveness validation...');

    try {
      // Phase 1: Test cache effectiveness
      const cacheEffectiveness = await this.cacheTests.testCacheEffectiveness();

      // Phase 2: Validate cost tracking accuracy
      const costAccuracy = await this.costValidator.validateCostTracking();

      // Phase 3: Measure performance improvements
      const performanceMetrics = await this.performanceAnalyzer.measurePerformanceMetrics();

      // Phase 4: Test personalization effectiveness
      const personalizationEffectiveness = await this.cacheTests.testPersonalizationEffectiveness();

      // Phase 5: Calculate overall score and recommendations
      const { overallScore, recommendations } = this.reportGenerator.calculateOverallScore({
        cacheEffectiveness,
        costAccuracy,
        performanceMetrics,
        personalizationEffectiveness,
      });

      const results: ValidationResults = {
        cacheEffectiveness,
        costAccuracy,
        performanceMetrics,
        personalizationEffectiveness,
        overallScore,
        recommendations,
      };

      logger.info('=== Cache Effectiveness Validation Results ===');
      logger.info(`Overall Score: ${overallScore.toFixed(1)}/100`);
      logger.info(`Cache Hit Rate: ${(cacheEffectiveness.hitRate * 100).toFixed(1)}%`);
      logger.info(`Cost Tracking Accuracy: ${(costAccuracy.accuracy * 100).toFixed(1)}%`);
      logger.info(
        `Response Time Improvement: ${performanceMetrics.responseTimeImprovement.toFixed(1)}%`
      );
      logger.info(
        `Personalization Benefit: ${(personalizationEffectiveness.personalizationBenefit * 100).toFixed(1)}%`
      );
      logger.info('===============================================');

      return results;
    } catch (error) {
      logger.error('Cache effectiveness validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate detailed report
   */
  async generateDetailedReport(): Promise<string> {
    const results = await this.runValidation();
    return this.reportGenerator.generateDetailedReport(results);
  }
}

/**
 * Main validation runner
 */
async function runCacheEffectivenessValidation(): Promise<void> {
  const validator = new CacheEffectivenessValidator();

  try {
    const results = await validator.runValidation();

    if (results.overallScore >= 80) {
      logger.info('✅ Cache system passes effectiveness validation!');
    } else if (results.overallScore >= 60) {
      logger.warn('⚠️  Cache system needs optimization');
    } else {
      logger.error('❌ Cache system requires significant improvements');
    }

    // Generate detailed report
    const report = await validator.generateDetailedReport();
    logger.info('Detailed report generated');
    logger.info(report);
  } catch (error) {
    logger.error('Cache effectiveness validation failed:', error);
    throw error;
  }
}

// Export for use in other test files
export { CacheEffectivenessValidator, runCacheEffectivenessValidation };

// Run validation if called directly
if (require.main === module) {
  runCacheEffectivenessValidation();
}