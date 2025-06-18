import { logger } from '../../utils/logger';
import { QueryIntent } from './AccuracyCalculator';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'content' | 'structure' | 'relevance' | 'diversity';
  message: string;
  severity: number; // 1-10 scale
}

export interface QualityThresholds {
  minPrecision: number;
  minRecall: number;
  minRelevance: number;
  minDiversity: number;
  maxResponseTime: number;
}

export class AccuracyValidation {
  private readonly DEFAULT_THRESHOLDS: QualityThresholds = {
    minPrecision: 0.6,
    minRecall: 0.4,
    minRelevance: 0.7,
    minDiversity: 0.3,
    maxResponseTime: 2000,
  };

  /**
   * Validate search results quality
   */
  validateSearchResults(
    results: any[],
    query: string,
    intent: QueryIntent,
    metrics: any,
    thresholds: Partial<QualityThresholds> = {}
  ): ValidationResult {
    const finalThresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Validate basic result quality
    this.validateBasicQuality(results, query, intent, issues, recommendations);

    // Validate metrics against thresholds
    this.validateMetricsThresholds(metrics, finalThresholds, issues, recommendations);

    // Validate content relevance
    this.validateContentRelevance(results, intent, issues, recommendations);

    // Validate result diversity
    this.validateResultDiversity(results, issues, recommendations);

    // Validate query intent alignment
    this.validateIntentAlignment(results, intent, issues, recommendations);

    // Calculate overall validation score
    const score = this.calculateValidationScore(issues, results.length);

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      score,
      issues,
      recommendations,
    };
  }

  /**
   * Validate basic result quality
   */
  private validateBasicQuality(
    results: any[],
    _query: string,
    intent: QueryIntent,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    // Check if we have results
    if (results.length === 0) {
      issues.push({
        type: 'error',
        category: 'content',
        message: 'No search results returned',
        severity: 10,
      });
      recommendations.push('Review search index and query processing');
      return;
    }

    // Check for minimum result count
    const expectedMinResults = this.getExpectedMinResults(intent);
    if (results.length < expectedMinResults) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: `Too few results (${results.length}), expected at least ${expectedMinResults}`,
        severity: 6,
      });
      recommendations.push('Expand search criteria or review content coverage');
    }

    // Check for duplicate results
    const uniqueIds = new Set(results.map(r => r.id));
    if (uniqueIds.size < results.length) {
      issues.push({
        type: 'error',
        category: 'content',
        message: 'Duplicate results detected',
        severity: 8,
      });
      recommendations.push('Implement deduplication logic');
    }

    // Check for empty or invalid content
    const invalidResults = results.filter(r => !r.content || r.content.trim().length < 10);
    if (invalidResults.length > 0) {
      issues.push({
        type: 'error',
        category: 'content',
        message: `${invalidResults.length} results have insufficient content`,
        severity: 7,
      });
      recommendations.push('Review content extraction and validation');
    }
  }

  /**
   * Validate metrics against quality thresholds
   */
  private validateMetricsThresholds(
    metrics: any,
    thresholds: QualityThresholds,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    if (metrics.precision < thresholds.minPrecision) {
      issues.push({
        type: 'warning',
        category: 'relevance',
        message: `Low precision (${(metrics.precision * 100).toFixed(1)}%), expected ≥${(thresholds.minPrecision * 100).toFixed(1)}%`,
        severity: 7,
      });
      recommendations.push('Improve result ranking algorithm');
    }

    if (metrics.recall < thresholds.minRecall) {
      issues.push({
        type: 'warning',
        category: 'relevance',
        message: `Low recall (${(metrics.recall * 100).toFixed(1)}%), expected ≥${(thresholds.minRecall * 100).toFixed(1)}%`,
        severity: 6,
      });
      recommendations.push('Expand search scope or improve query matching');
    }

    if (metrics.relevanceScore < thresholds.minRelevance) {
      issues.push({
        type: 'warning',
        category: 'relevance',
        message: `Low relevance score (${(metrics.relevanceScore * 100).toFixed(1)}%), expected ≥${(thresholds.minRelevance * 100).toFixed(1)}%`,
        severity: 8,
      });
      recommendations.push('Review relevance scoring algorithm');
    }

    if (metrics.diversityScore < thresholds.minDiversity) {
      issues.push({
        type: 'info',
        category: 'diversity',
        message: `Low diversity score (${(metrics.diversityScore * 100).toFixed(1)}%), expected ≥${(thresholds.minDiversity * 100).toFixed(1)}%`,
        severity: 4,
      });
      recommendations.push('Implement diversity-aware ranking');
    }
  }

  /**
   * Validate content relevance
   */
  private validateContentRelevance(
    results: any[],
    intent: QueryIntent,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    const topResults = results.slice(0, 5);
    const relevantResults = topResults.filter(r => r.relevanceScore > 0.5);

    if (relevantResults.length === 0) {
      issues.push({
        type: 'error',
        category: 'relevance',
        message: 'No highly relevant results in top 5',
        severity: 9,
      });
      recommendations.push('Review query understanding and content matching');
    }

    // Check for content type alignment
    if (intent.expectedContentTypes.length > 0) {
      const typeMatchingResults = topResults.filter(r =>
        intent.expectedContentTypes.includes(r.metadata.contentType)
      );

      if (typeMatchingResults.length === 0) {
        issues.push({
          type: 'warning',
          category: 'relevance',
          message: 'No results match expected content types',
          severity: 6,
        });
        recommendations.push('Improve content type classification or matching');
      }
    }

    // Check for concept alignment
    if (intent.concepts.length > 0) {
      const conceptMatchingResults = topResults.filter(r => r.conceptMatches > 0);
      if (conceptMatchingResults.length === 0) {
        issues.push({
          type: 'warning',
          category: 'relevance',
          message: 'No results match identified concepts',
          severity: 5,
        });
        recommendations.push('Enhance concept extraction and matching');
      }
    }
  }

  /**
   * Validate result diversity
   */
  private validateResultDiversity(
    results: any[],
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    const topResults = results.slice(0, 10);
    
    // Check section diversity
    const uniqueSections = new Set(topResults.map(r => r.metadata.sectionTitle));
    if (uniqueSections.size < Math.min(3, topResults.length)) {
      issues.push({
        type: 'info',
        category: 'diversity',
        message: 'Low section diversity in top results',
        severity: 3,
      });
      recommendations.push('Implement section-aware diversity ranking');
    }

    // Check content type diversity
    const uniqueTypes = new Set(topResults.map(r => r.metadata.contentType));
    if (uniqueTypes.size < Math.min(2, topResults.length)) {
      issues.push({
        type: 'info',
        category: 'diversity',
        message: 'Low content type diversity',
        severity: 2,
      });
      recommendations.push('Promote content type diversity in ranking');
    }
  }

  /**
   * Validate query intent alignment
   */
  private validateIntentAlignment(
    results: any[],
    _intent: QueryIntent,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    const intentMatchingResults = results.filter(r => r.intentMatch);
    const topResults = results.slice(0, 5);
    const topIntentMatches = topResults.filter(r => r.intentMatch);

    if (intentMatchingResults.length === 0) {
      issues.push({
        type: 'warning',
        category: 'relevance',
        message: 'No results match detected query intent',
        severity: 7,
      });
      recommendations.push('Improve query intent detection and matching');
    }

    if (topIntentMatches.length === 0 && intentMatchingResults.length > 0) {
      issues.push({
        type: 'warning',
        category: 'relevance',
        message: 'Intent-matching results not in top positions',
        severity: 5,
      });
      recommendations.push('Boost intent-matching results in ranking');
    }
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(issues: ValidationIssue[], resultCount: number): number {
    let score = 100;

    // Deduct points for issues
    issues.forEach(issue => {
      const multiplier = issue.type === 'error' ? 1.5 : issue.type === 'warning' ? 1.0 : 0.5;
      score -= (issue.severity * multiplier);
    });

    // Bonus for having results
    if (resultCount > 0) {
      score += Math.min(resultCount * 2, 10);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get expected minimum results based on intent
   */
  private getExpectedMinResults(intent: QueryIntent): number {
    switch (intent.type) {
      case 'definition':
        return 3;
      case 'example':
        return 5;
      case 'comparison':
        return 6;
      case 'how-to':
        return 4;
      default:
        return 3;
    }
  }

  /**
   * Validate search performance
   */
  validatePerformance(
    searchTime: number,
    processingTime: number,
    thresholds: Partial<QualityThresholds> = {}
  ): ValidationResult {
    const finalThresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    const totalTime = searchTime + processingTime;

    if (totalTime > finalThresholds.maxResponseTime) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: `Response time too slow (${totalTime}ms), expected ≤${finalThresholds.maxResponseTime}ms`,
        severity: 6,
      });
      recommendations.push('Optimize search query execution and result processing');
    }

    if (searchTime > finalThresholds.maxResponseTime * 0.8) {
      issues.push({
        type: 'info',
        category: 'content',
        message: `Search time approaching limit (${searchTime}ms)`,
        severity: 4,
      });
      recommendations.push('Consider search optimization or caching');
    }

    const score = this.calculateValidationScore(issues, 1);

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      score,
      issues,
      recommendations,
    };
  }
}