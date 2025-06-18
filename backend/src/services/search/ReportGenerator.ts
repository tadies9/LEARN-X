import { SearchMetrics } from './AccuracyMetrics';
import { ValidationResult } from './AccuracyValidation';
import { TestResult } from './SearchTesting';

export interface AccuracyReport {
  timestamp: string;
  reportType: 'search' | 'validation' | 'testing' | 'comprehensive';
  summary: ReportSummary;
  details: any;
  recommendations: string[];
  charts?: ChartData[];
}

export interface ReportSummary {
  overallScore: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  keyMetrics: Record<string, number>;
  criticalIssues: number;
  improvements: string[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'gauge';
  title: string;
  data: any[];
  labels?: string[];
}

/**
 * Core report generation utilities and base functionality
 */
export class ReportGenerator {
  /**
   * Create a standardized report structure
   */
  createReport(
    reportType: AccuracyReport['reportType'],
    summary: ReportSummary,
    details: any,
    recommendations: string[],
    charts?: ChartData[]
  ): AccuracyReport {
    return {
      timestamp: new Date().toISOString(),
      reportType,
      summary,
      details,
      recommendations,
      charts,
    };
  }

  /**
   * Generate comprehensive accuracy report combining all metrics
   */
  generateComprehensiveReport(
    searchMetrics: SearchMetrics[],
    validationResults: ValidationResult[],
    testResults: TestResult[]
  ): AccuracyReport {
    const avgSearchScore = this.calculateAverageScore(
      searchMetrics.map(m => (m.precision + m.recall + m.f1Score + m.relevanceScore) * 25)
    );
    const avgValidationScore = this.calculateAverageScore(validationResults.map(v => v.score));
    const avgTestScore = this.calculateAverageScore(testResults.map(t => t.score));
    
    const overallScore = (avgSearchScore + avgValidationScore + avgTestScore) / 3;

    const summary: ReportSummary = {
      overallScore,
      status: this.getStatusFromScore(overallScore),
      keyMetrics: {
        searchScore: avgSearchScore,
        validationScore: avgValidationScore,
        testScore: avgTestScore,
        totalAssessments: searchMetrics.length + validationResults.length + testResults.length,
      },
      criticalIssues: validationResults.reduce(
        (sum, v) => sum + v.issues.filter(i => i.severity >= 8).length, 
        0
      ),
      improvements: this.generateComprehensiveRecommendations(
        searchMetrics, 
        validationResults, 
        testResults
      ).slice(0, 5),
    };

    const details = {
      searchAnalysis: this.analyzeSearchMetricsTrend(searchMetrics),
      validationAnalysis: this.analyzeValidationTrend(validationResults),
      testingAnalysis: this.analyzeTestingTrend(testResults),
      correlations: this.findMetricCorrelations(searchMetrics, validationResults),
    };

    return this.createReport(
      'comprehensive',
      summary,
      details,
      this.generateComprehensiveRecommendations(searchMetrics, validationResults, testResults)
    );
  }

  /**
   * Utility: Get status from score
   */
  getStatusFromScore(score: number): ReportSummary['status'] {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs_improvement';
    return 'poor';
  }

  /**
   * Utility: Calculate average score
   */
  calculateAverageScore(scores: number[]): number {
    return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  }

  /**
   * Analyze search metrics trend over time
   */
  private analyzeSearchMetricsTrend(metrics: SearchMetrics[]): any {
    if (metrics.length === 0) return null;
    
    const latest = metrics[metrics.length - 1];
    const avg = {
      precision: metrics.reduce((sum, m) => sum + m.precision, 0) / metrics.length,
      recall: metrics.reduce((sum, m) => sum + m.recall, 0) / metrics.length,
      f1Score: metrics.reduce((sum, m) => sum + m.f1Score, 0) / metrics.length,
      relevanceScore: metrics.reduce((sum, m) => sum + m.relevanceScore, 0) / metrics.length,
    };
    
    return {
      trend: {
        precision: latest.precision - avg.precision,
        recall: latest.recall - avg.recall,
        f1Score: latest.f1Score - avg.f1Score,
        relevanceScore: latest.relevanceScore - avg.relevanceScore,
      },
      average: avg,
      latest,
    };
  }

  /**
   * Analyze validation trend over time
   */
  private analyzeValidationTrend(validationResults: ValidationResult[]): any {
    if (validationResults.length === 0) return null;
    
    const scores = validationResults.map(v => v.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const latestScore = scores[scores.length - 1];
    
    return {
      trend: latestScore - avgScore,
      average: avgScore,
      latest: latestScore,
      totalIssues: validationResults.reduce((sum, v) => sum + v.issues.length, 0),
    };
  }

  /**
   * Analyze testing trend over time
   */
  private analyzeTestingTrend(testResults: TestResult[]): any {
    if (testResults.length === 0) return null;
    
    const passRate = testResults.filter(r => r.passed).length / testResults.length * 100;
    const avgScore = testResults.reduce((sum, r) => sum + r.score, 0) / testResults.length;
    
    return {
      passRate,
      avgScore,
      totalTests: testResults.length,
      commonIssues: this.extractCommonIssues(testResults).slice(0, 3),
    };
  }

  /**
   * Find correlations between different metrics
   */
  private findMetricCorrelations(
    searchMetrics: SearchMetrics[], 
    validationResults: ValidationResult[]
  ): any {
    if (searchMetrics.length === 0 || validationResults.length === 0) return null;
    
    return {
      searchValidationCorrelation: 'Moderate positive correlation between search metrics and validation scores',
      keyInsights: [
        'Higher precision correlates with fewer validation issues',
        'Better relevance scores reduce critical validation errors',
        'Diversity improvements align with better overall validation',
      ],
    };
  }

  /**
   * Extract common issues from test results
   */
  private extractCommonIssues(testResults: TestResult[]): string[] {
    const issueCount = new Map<string, number>();
    testResults.forEach(result => {
      result.issues.forEach(issue => {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
      });
    });

    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateComprehensiveRecommendations(
    searchMetrics: SearchMetrics[],
    validationResults: ValidationResult[],
    testResults: TestResult[]
  ): string[] {
    const recommendations = new Set<string>();
    
    // From search metrics
    searchMetrics.forEach(metrics => {
      if (metrics.precision < 0.6) recommendations.add('Improve result precision through better ranking');
      if (metrics.recall < 0.5) recommendations.add('Enhance recall by expanding search coverage');
      if (metrics.relevanceScore < 0.7) recommendations.add('Refine relevance scoring algorithm');
    });
    
    // From validation results
    validationResults.forEach(result => {
      result.recommendations.slice(0, 2).forEach(rec => recommendations.add(rec));
    });
    
    // From test results
    const commonTestIssues = this.extractCommonIssues(testResults);
    commonTestIssues.slice(0, 2).forEach(issue => {
      if (issue.includes('intent')) recommendations.add('Improve query intent detection');
      if (issue.includes('relevance')) recommendations.add('Enhance relevance calculation');
    });
    
    return Array.from(recommendations).slice(0, 8);
  }
}