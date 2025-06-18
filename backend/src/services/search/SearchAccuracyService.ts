import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';
import { EnhancedSearchService } from './EnhancedSearchService';
import { AccuracyCalculator, QueryIntent } from './AccuracyCalculator';
import { AccuracyMetrics, SearchMetrics } from './AccuracyMetrics';
import { AccuracyValidation } from './AccuracyValidation';
import { SearchTesting } from './SearchTesting';
import { AccuracyReporting } from './AccuracyReporting';
import { QueryProcessor } from './QueryProcessor';
import { ResultProcessor } from './ResultProcessor';

export class SearchAccuracyService {
  private enhancedSearch: EnhancedSearchService;
  private calculator: AccuracyCalculator;
  private metrics: AccuracyMetrics;
  private validation: AccuracyValidation;
  private testing: SearchTesting;
  private reporting: AccuracyReporting;
  private queryProcessor: QueryProcessor;
  private resultProcessor: ResultProcessor;

  constructor() {
    this.enhancedSearch = new EnhancedSearchService();
    this.calculator = new AccuracyCalculator();
    this.metrics = new AccuracyMetrics();
    this.validation = new AccuracyValidation();
    this.testing = new SearchTesting();
    this.reporting = new AccuracyReporting();
    this.queryProcessor = new QueryProcessor();
    this.resultProcessor = new ResultProcessor();
  }

  /**
   * Analyze query intent to improve search accuracy
   */
  async analyzeQueryIntent(query: string): Promise<QueryIntent> {
    return this.queryProcessor.analyzeQueryIntent(query);
  }

  /**
   * Perform intent-aware search with improved accuracy
   */
  async searchWithIntent(query: string, userId: string, options: any = {}): Promise<any> {
    const searchStartTime = Date.now();

    // Analyze query intent
    const intent = await this.analyzeQueryIntent(query);

    logger.info('[SearchAccuracy] Query intent analysis:', {
      query,
      intent,
    });

    // Adjust search parameters based on intent
    const searchOptions = this.queryProcessor.optimizeSearchForIntent(intent, options);

    // Perform enhanced search
    const results = await this.enhancedSearch.search(query, userId, searchOptions);
    const searchTime = Date.now() - searchStartTime;

    // Post-process results based on intent
    const processingStartTime = Date.now();
    const improvedResults = await this.resultProcessor.postProcessResults(results, intent, query);
    const processingTime = Date.now() - processingStartTime;

    // Calculate metrics using AccuracyMetrics
    const metrics = this.metrics.calculateSearchMetrics(improvedResults, intent);

    // Add performance metrics
    const enhancedMetrics = this.metrics.addPerformanceMetrics(
      metrics,
      searchTime,
      processingTime,
      improvedResults.results.length
    );

    // Validate results quality
    const validationResult = this.validation.validateSearchResults(
      improvedResults.results,
      query,
      intent,
      enhancedMetrics
    );

    logger.info('[SearchAccuracy] Search completed:', {
      metrics: enhancedMetrics,
      validation: {
        isValid: validationResult.isValid,
        score: validationResult.score,
        issueCount: validationResult.issues.length,
      },
    });

    return {
      ...improvedResults,
      intent,
      metrics: enhancedMetrics,
      validation: validationResult,
    };
  }

  /**
   * Learn from user feedback to improve accuracy
   */
  async learnFromFeedback(
    searchId: string,
    clickedResults: string[],
    userId: string
  ): Promise<void> {
    try {
      // Store feedback for future improvements
      const feedback = {
        search_id: searchId,
        user_id: userId,
        clicked_results: clickedResults,
        timestamp: new Date().toISOString(),
      };

      await supabase.from('search_feedback').insert(feedback);

      logger.info('[SearchAccuracy] Feedback recorded:', {
        searchId,
        clickedCount: clickedResults.length,
      });
    } catch (error) {
      logger.error('[SearchAccuracy] Failed to record feedback:', error);
    }
  }

  /**
   * Generate comprehensive accuracy report
   */
  async generateAccuracyReport(
    query: string,
    searchResults: any,
    metrics: SearchMetrics,
    validationResult: any
  ): Promise<any> {
    return this.reporting.generateSearchReport(
      query,
      metrics,
      searchResults.results,
      searchResults.intent,
      validationResult
    );
  }

  /**
   * Run accuracy tests
   */
  async runAccuracyTests(): Promise<any> {
    const testCases = this.testing.generateTestCases();
    this.testing.createTestSuite('default', 'Default accuracy test suite', testCases);

    const testResults = await this.testing.executeTestSuite(
      'default',
      (query: string, userId: string) => this.searchWithIntent(query, userId)
    );

    return this.reporting.generateTestingReport(testResults);
  }

  /**
   * Validate search results with custom thresholds
   */
  async validateSearchResults(
    results: any[],
    query: string,
    intent: QueryIntent,
    metrics: SearchMetrics,
    customThresholds?: any
  ): Promise<any> {
    return this.validation.validateSearchResults(results, query, intent, metrics, customThresholds);
  }

  /**
   * Get comprehensive search analytics
   */
  async getSearchAnalytics(
    searchHistory: any[],
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    // Filter by time range if provided
    let filteredHistory = searchHistory;
    if (timeRange) {
      filteredHistory = searchHistory.filter((search) => {
        const searchDate = new Date(search.timestamp);
        return searchDate >= timeRange.start && searchDate <= timeRange.end;
      });
    }

    // Extract metrics and validation results
    const searchMetrics = filteredHistory.map((search) => search.metrics).filter(Boolean);
    const validationResults = filteredHistory.map((search) => search.validation).filter(Boolean);

    // Generate comprehensive report
    return this.reporting.generateComprehensiveReport(
      searchMetrics,
      validationResults,
      [] // Test results would be added separately
    );
  }

  /**
   * Get testing service for external use
   */
  getTestingService(): SearchTesting {
    return this.testing;
  }

  /**
   * Get reporting service for external use
   */
  getReportingService(): AccuracyReporting {
    return this.reporting;
  }

  /**
   * Get validation service for external use
   */
  getValidationService(): AccuracyValidation {
    return this.validation;
  }

  /**
   * Get query processor for external use
   */
  getQueryProcessor(): QueryProcessor {
    return this.queryProcessor;
  }

  /**
   * Get result processor for external use
   */
  getResultProcessor(): ResultProcessor {
    return this.resultProcessor;
  }

  /**
   * Get accuracy calculator for external use
   */
  getAccuracyCalculator(): AccuracyCalculator {
    return this.calculator;
  }

  /**
   * Get metrics service for external use
   */
  getMetricsService(): AccuracyMetrics {
    return this.metrics;
  }
}
