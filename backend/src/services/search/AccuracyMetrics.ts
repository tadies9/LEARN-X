import { logger } from '../../utils/logger';
import { AccuracyCalculator, QueryIntent } from './AccuracyCalculator';

export interface SearchMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  relevanceScore: number;
  diversityScore: number;
  performanceMetrics?: PerformanceMetrics;
  qualityMetrics?: QualityMetrics;
}

export interface PerformanceMetrics {
  searchTime: number;
  processingTime: number;
  resultCount: number;
  cacheHitRate?: number;
}

export interface QualityMetrics {
  intentMatchRate: number;
  conceptMatchRate: number;
  contentTypeMatchRate: number;
  structureQualityScore: number;
}

export class AccuracyMetrics {
  private calculator: AccuracyCalculator;

  constructor() {
    this.calculator = new AccuracyCalculator();
  }

  /**
   * Calculate comprehensive search quality metrics
   */
  calculateSearchMetrics(results: any, intent: QueryIntent): SearchMetrics {
    const topResults = results.results.slice(0, 10);

    // Core accuracy metrics
    const precision = this.calculatePrecision(topResults, intent);
    const recall = this.calculateRecall(topResults, intent);
    const f1Score = this.calculator.calculateF1Score(precision, recall);

    // Quality metrics
    const relevanceScore = this.calculator.calculateAverageRelevance(topResults);
    const diversityScore = this.calculator.calculateDiversityScore(topResults);

    // Additional quality metrics
    const qualityMetrics = this.calculateQualityMetrics(topResults, intent);

    const metrics: SearchMetrics = {
      precision,
      recall,
      f1Score,
      relevanceScore,
      diversityScore,
      qualityMetrics,
    };

    this.logMetrics(metrics, intent);
    return metrics;
  }

  /**
   * Calculate precision with intent-aware relevance
   */
  private calculatePrecision(results: any[], intent: QueryIntent): number {
    const relevantCount = results.filter(
      (r: any) => r.intentMatch || (r.relevanceScore && r.relevanceScore > 0.7)
    ).length;

    return this.calculator.calculatePrecision(relevantCount, results.length);
  }

  /**
   * Calculate recall estimate based on expected results
   */
  private calculateRecall(results: any[], _intent: QueryIntent): number {
    const relevantCount = results.filter(
      (r: any) => r.intentMatch || (r.relevanceScore && r.relevanceScore > 0.7)
    ).length;

    const expectedResults = this.calculator.calculateExpectedResults(_intent);
    return this.calculator.calculateRecall(relevantCount, expectedResults);
  }

  /**
   * Calculate detailed quality metrics
   */
  private calculateQualityMetrics(results: any[], intent: QueryIntent): QualityMetrics {
    if (results.length === 0) {
      return {
        intentMatchRate: 0,
        conceptMatchRate: 0,
        contentTypeMatchRate: 0,
        structureQualityScore: 0,
      };
    }

    // Intent match rate
    const intentMatches = results.filter((r) => r.intentMatch).length;
    const intentMatchRate = intentMatches / results.length;

    // Concept match rate
    const conceptMatches = results.filter((r) => r.conceptMatches && r.conceptMatches > 0).length;
    const conceptMatchRate = conceptMatches / results.length;

    // Content type match rate
    const typeMatches = results.filter((r) =>
      intent.expectedContentTypes.includes(r.metadata.contentType)
    ).length;
    const contentTypeMatchRate = typeMatches / results.length;

    // Structure quality score (based on hierarchy levels)
    const avgHierarchy = results.reduce(
      (sum, r) => sum + (r.metadata.hierarchyLevel || 5),
      0
    ) / results.length;
    const structureQualityScore = Math.max(0, (5 - avgHierarchy) / 5);

    return {
      intentMatchRate,
      conceptMatchRate,
      contentTypeMatchRate,
      structureQualityScore,
    };
  }

  /**
   * Add performance metrics to search metrics
   */
  addPerformanceMetrics(
    metrics: SearchMetrics,
    searchTime: number,
    processingTime: number,
    resultCount: number,
    cacheHitRate?: number
  ): SearchMetrics {
    return {
      ...metrics,
      performanceMetrics: {
        searchTime,
        processingTime,
        resultCount,
        cacheHitRate,
      },
    };
  }

  /**
   * Calculate metrics trend over time
   */
  calculateMetricsTrend(currentMetrics: SearchMetrics, historicalMetrics: SearchMetrics[]): {
    precisionTrend: number;
    recallTrend: number;
    f1Trend: number;
    relevanceTrend: number;
  } {
    if (historicalMetrics.length === 0) {
      return {
        precisionTrend: 0,
        recallTrend: 0,
        f1Trend: 0,
        relevanceTrend: 0,
      };
    }

    const avgHistorical = this.calculateAverageMetrics(historicalMetrics);

    return {
      precisionTrend: currentMetrics.precision - avgHistorical.precision,
      recallTrend: currentMetrics.recall - avgHistorical.recall,
      f1Trend: currentMetrics.f1Score - avgHistorical.f1Score,
      relevanceTrend: currentMetrics.relevanceScore - avgHistorical.relevanceScore,
    };
  }

  /**
   * Calculate average metrics from historical data
   */
  private calculateAverageMetrics(metrics: SearchMetrics[]): SearchMetrics {
    const count = metrics.length;
    
    return {
      precision: metrics.reduce((sum, m) => sum + m.precision, 0) / count,
      recall: metrics.reduce((sum, m) => sum + m.recall, 0) / count,
      f1Score: metrics.reduce((sum, m) => sum + m.f1Score, 0) / count,
      relevanceScore: metrics.reduce((sum, m) => sum + m.relevanceScore, 0) / count,
      diversityScore: metrics.reduce((sum, m) => sum + m.diversityScore, 0) / count,
    };
  }

  /**
   * Identify areas for improvement based on metrics
   */
  identifyImprovementAreas(metrics: SearchMetrics): string[] {
    const improvements: string[] = [];

    if (metrics.precision < 0.6) {
      improvements.push('precision');
    }

    if (metrics.recall < 0.5) {
      improvements.push('recall');
    }

    if (metrics.relevanceScore < 0.7) {
      improvements.push('relevance');
    }

    if (metrics.diversityScore < 0.4) {
      improvements.push('diversity');
    }

    if (metrics.qualityMetrics) {
      if (metrics.qualityMetrics.intentMatchRate < 0.5) {
        improvements.push('intent_matching');
      }

      if (metrics.qualityMetrics.conceptMatchRate < 0.4) {
        improvements.push('concept_matching');
      }
    }

    return improvements;
  }

  /**
   * Generate metrics summary for logging
   */
  generateMetricsSummary(metrics: SearchMetrics): string {
    const summary = [
      `Precision: ${(metrics.precision * 100).toFixed(1)}%`,
      `Recall: ${(metrics.recall * 100).toFixed(1)}%`,
      `F1: ${(metrics.f1Score * 100).toFixed(1)}%`,
      `Relevance: ${(metrics.relevanceScore * 100).toFixed(1)}%`,
      `Diversity: ${(metrics.diversityScore * 100).toFixed(1)}%`,
    ];

    if (metrics.performanceMetrics) {
      summary.push(`Search Time: ${metrics.performanceMetrics.searchTime}ms`);
      summary.push(`Results: ${metrics.performanceMetrics.resultCount}`);
    }

    return summary.join(' | ');
  }

  /**
   * Log metrics with appropriate level based on quality
   */
  private logMetrics(metrics: SearchMetrics, intent: QueryIntent): void {
    const summary = this.generateMetricsSummary(metrics);
    const improvements = this.identifyImprovementAreas(metrics);

    if (improvements.length > 0) {
      logger.warn(`[AccuracyMetrics] Search quality needs improvement: ${summary}`, {
        intent: intent.type,
        improvements,
        metrics,
      });
    } else {
      logger.info(`[AccuracyMetrics] Search quality good: ${summary}`, {
        intent: intent.type,
        metrics,
      });
    }
  }
}