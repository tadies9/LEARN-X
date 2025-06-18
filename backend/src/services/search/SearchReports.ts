import { SearchMetrics } from './AccuracyMetrics';
import { ValidationResult } from './AccuracyValidation';
import { AccuracyReport, ReportSummary, ReportGenerator } from './ReportGenerator';
import { ChartDataGenerator } from './ChartDataGenerator';

/**
 * Search-specific report generation functionality
 */
export class SearchReports {
  private reportGenerator: ReportGenerator;
  private chartGenerator: ChartDataGenerator;

  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.chartGenerator = new ChartDataGenerator();
  }

  /**
   * Generate comprehensive search accuracy report
   */
  generateSearchReport(
    query: string,
    metrics: SearchMetrics,
    results: any[],
    intent: any,
    validationResult?: ValidationResult
  ): AccuracyReport {
    const summary = this.createSearchSummary(metrics, validationResult);
    const recommendations = this.generateSearchRecommendations(metrics, validationResult);
    
    const details = {
      query,
      intent,
      metrics,
      validation: validationResult,
      resultAnalysis: this.analyzeResults(results),
      performance: metrics.performanceMetrics,
    };

    const charts = this.chartGenerator.generateSearchCharts(metrics, results);

    return this.reportGenerator.createReport(
      'search',
      summary,
      details,
      recommendations,
      charts
    );
  }

  /**
   * Create search summary from metrics and validation
   */
  private createSearchSummary(metrics: SearchMetrics, validationResult?: ValidationResult): ReportSummary {
    const searchScore = (metrics.precision + metrics.recall + metrics.f1Score + metrics.relevanceScore) * 25;
    const finalScore = validationResult ? (searchScore + validationResult.score) / 2 : searchScore;
    
    return {
      overallScore: finalScore,
      status: this.reportGenerator.getStatusFromScore(finalScore),
      keyMetrics: {
        precision: metrics.precision * 100,
        recall: metrics.recall * 100,
        f1Score: metrics.f1Score * 100,
        relevanceScore: metrics.relevanceScore * 100,
        diversityScore: metrics.diversityScore * 100,
      },
      criticalIssues: validationResult ? validationResult.issues.filter(i => i.severity >= 8).length : 0,
      improvements: validationResult ? validationResult.recommendations.slice(0, 3) : [],
    };
  }

  /**
   * Generate search-specific recommendations
   */
  private generateSearchRecommendations(metrics: SearchMetrics, validationResult?: ValidationResult): string[] {
    const recommendations: string[] = [];
    
    // Precision-based recommendations
    if (metrics.precision < 0.6) {
      recommendations.push('Improve result ranking to increase precision');
      recommendations.push('Consider implementing stricter relevance thresholds');
    }
    
    // Recall-based recommendations
    if (metrics.recall < 0.5) {
      recommendations.push('Expand search scope to improve recall');
      recommendations.push('Review query expansion strategies');
    }
    
    // Relevance-based recommendations
    if (metrics.relevanceScore < 0.7) {
      recommendations.push('Enhance relevance scoring algorithm');
      recommendations.push('Consider semantic similarity improvements');
    }
    
    // Diversity-based recommendations
    if (metrics.diversityScore < 0.4) {
      recommendations.push('Implement diversity-aware result ranking');
      recommendations.push('Balance relevance with result variety');
    }

    // Performance-based recommendations
    if (metrics.performanceMetrics && 'responseTime' in metrics.performanceMetrics && metrics.performanceMetrics.responseTime > 1000) {
      recommendations.push('Optimize search performance for faster response times');
    }

    // F1 score optimization
    if (metrics.f1Score < 0.6) {
      recommendations.push('Balance precision and recall for better F1 score');
    }
    
    // Include validation recommendations if available
    if (validationResult) {
      recommendations.push(...validationResult.recommendations.slice(0, 2));
    }
    
    return Array.from(new Set(recommendations)).slice(0, 8);
  }

  /**
   * Analyze search results for detailed insights
   */
  private analyzeResults(results: any[]): any {
    const analysis = {
      totalResults: results.length,
      avgScore: results.reduce((sum, r) => sum + (r.score || 0), 0) / Math.max(results.length, 1),
      topScore: Math.max(...results.map(r => r.score || 0), 0),
      intentMatches: results.filter(r => r.intentMatch).length,
      contentTypeDistribution: this.getContentTypeDistribution(results),
      sectionDistribution: this.getSectionDistribution(results),
      scoreDistribution: this.getScoreDistribution(results),
      relevanceInsights: this.analyzeRelevance(results),
    };

    return analysis;
  }

  /**
   * Get content type distribution from results
   */
  private getContentTypeDistribution(results: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    results.forEach(r => {
      const type = r.metadata?.contentType || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Get section distribution from results
   */
  private getSectionDistribution(results: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    results.forEach(r => {
      const section = r.metadata?.sectionTitle || 'unknown';
      distribution[section] = (distribution[section] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Get score distribution analysis
   */
  private getScoreDistribution(results: any[]): {
    ranges: Record<string, number>;
    median: number;
    quartiles: { q1: number; q3: number };
  } {
    const scores = results.map(r => r.score || 0).sort((a, b) => a - b);
    
    const ranges = {
      'High (0.8-1.0)': scores.filter(s => s >= 0.8).length,
      'Medium (0.5-0.79)': scores.filter(s => s >= 0.5 && s < 0.8).length,
      'Low (0-0.49)': scores.filter(s => s < 0.5).length,
    };

    const median = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0;
    const q1 = scores.length > 0 ? scores[Math.floor(scores.length * 0.25)] : 0;
    const q3 = scores.length > 0 ? scores[Math.floor(scores.length * 0.75)] : 0;

    return {
      ranges,
      median,
      quartiles: { q1, q3 },
    };
  }

  /**
   * Analyze relevance patterns in results
   */
  private analyzeRelevance(results: any[]): any {
    const highRelevance = results.filter(r => (r.score || 0) >= 0.8);
    const mediumRelevance = results.filter(r => (r.score || 0) >= 0.5 && (r.score || 0) < 0.8);
    const lowRelevance = results.filter(r => (r.score || 0) < 0.5);

    return {
      highRelevanceCount: highRelevance.length,
      mediumRelevanceCount: mediumRelevance.length,
      lowRelevanceCount: lowRelevance.length,
      relevanceDropoff: this.calculateRelevanceDropoff(results),
      topResultsQuality: this.analyzeTopResults(results.slice(0, 10)),
    };
  }

  /**
   * Calculate how quickly relevance drops off in results
   */
  private calculateRelevanceDropoff(results: any[]): number {
    if (results.length < 2) return 0;
    
    const scores = results.map(r => r.score || 0);
    let totalDrop = 0;
    
    for (let i = 1; i < scores.length; i++) {
      totalDrop += Math.max(0, scores[i-1] - scores[i]);
    }
    
    return totalDrop / (scores.length - 1);
  }

  /**
   * Analyze quality of top results
   */
  private analyzeTopResults(topResults: any[]): any {
    if (topResults.length === 0) return null;

    const avgScore = topResults.reduce((sum, r) => sum + (r.score || 0), 0) / topResults.length;
    const consistentQuality = topResults.filter(r => (r.score || 0) >= avgScore * 0.8).length;

    return {
      averageScore: avgScore,
      consistentQualityCount: consistentQuality,
      qualityConsistency: consistentQuality / topResults.length,
      intentMatchRate: topResults.filter(r => r.intentMatch).length / topResults.length,
    };
  }
}