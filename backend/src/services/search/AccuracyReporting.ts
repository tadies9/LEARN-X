import { SearchMetrics } from './AccuracyMetrics';
import { ValidationResult } from './AccuracyValidation';
import { TestResult } from './SearchTesting';

// Re-export types and interfaces from modules
export { AccuracyReport, ReportSummary, ChartData } from './ReportGenerator';

// Import specialized report generators
import { ReportGenerator } from './ReportGenerator';
import { ReportFormatters } from './ReportFormatters';
import { ChartDataGenerator } from './ChartDataGenerator';
import { SearchReports } from './SearchReports';
import { ValidationReports } from './ValidationReports';

/**
 * Main orchestrator for accuracy reporting functionality
 * Delegates to specialized modules while maintaining a unified interface
 */
export class AccuracyReporting {
  private reportGenerator: ReportGenerator;
  private reportFormatters: ReportFormatters;
  private chartGenerator: ChartDataGenerator;
  private searchReports: SearchReports;
  private validationReports: ValidationReports;

  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.reportFormatters = new ReportFormatters();
    this.chartGenerator = new ChartDataGenerator();
    this.searchReports = new SearchReports();
    this.validationReports = new ValidationReports();
  }

  /**
   * Generate search accuracy report
   */
  generateSearchReport(
    query: string,
    metrics: SearchMetrics,
    results: any[],
    intent: any,
    validationResult?: ValidationResult
  ) {
    return this.searchReports.generateSearchReport(
      query,
      metrics,
      results,
      intent,
      validationResult
    );
  }

  /**
   * Generate validation report
   */
  generateValidationReport(validationResult: ValidationResult) {
    return this.validationReports.generateValidationReport(validationResult);
  }

  /**
   * Generate testing report
   */
  generateTestingReport(testResults: TestResult[]) {
    return this.validationReports.generateTestingReport(testResults);
  }

  /**
   * Generate comprehensive accuracy report
   */
  generateComprehensiveReport(
    searchMetrics: SearchMetrics[],
    validationResults: ValidationResult[],
    testResults: TestResult[]
  ) {
    return this.reportGenerator.generateComprehensiveReport(
      searchMetrics,
      validationResults,
      testResults
    );
  }

  /**
   * Format report as text
   */
  formatReportAsText(report: any) {
    return this.reportFormatters.formatAsText(report);
  }

  /**
   * Format report as JSON
   */
  formatReportAsJSON(report: any) {
    return this.reportFormatters.formatAsJSON(report);
  }

  /**
   * Format report as HTML
   */
  formatReportAsHTML(report: any) {
    return this.reportFormatters.formatAsHTML(report);
  }

  /**
   * Format report as CSV
   */
  formatReportAsCSV(report: any) {
    return this.reportFormatters.formatAsCSV(report);
  }

  /**
   * Format report as Markdown
   */
  formatReportAsMarkdown(report: any) {
    return this.reportFormatters.formatAsMarkdown(report);
  }

  /**
   * Generate charts for search results
   */
  generateSearchCharts(metrics: SearchMetrics, results: any[]) {
    return this.chartGenerator.generateSearchCharts(metrics, results);
  }

  /**
   * Generate charts for validation results
   */
  generateValidationCharts(validationResult: ValidationResult) {
    return this.chartGenerator.generateValidationCharts(validationResult);
  }

  /**
   * Generate charts for test results
   */
  generateTestingCharts(testResults: TestResult[]) {
    return this.chartGenerator.generateTestingCharts(testResults);
  }

  /**
   * Generate comprehensive charts
   */
  generateComprehensiveCharts(
    searchMetrics: SearchMetrics[],
    validationResults: ValidationResult[],
    testResults: TestResult[]
  ) {
    return this.chartGenerator.generateComprehensiveCharts(
      searchMetrics,
      validationResults,
      testResults
    );
  }

  // Legacy compatibility methods - delegate to ReportGenerator utilities

  /**
   * Get status from score (utility method)
   */
  getStatusFromScore(score: number) {
    return this.reportGenerator.getStatusFromScore(score);
  }

  /**
   * Calculate average score (utility method)
   */
  calculateAverageScore(scores: number[]) {
    return this.reportGenerator.calculateAverageScore(scores);
  }
}
