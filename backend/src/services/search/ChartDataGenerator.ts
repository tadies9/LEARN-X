import { ChartData } from './ReportGenerator';
import { SearchMetrics } from './AccuracyMetrics';
import { ValidationResult } from './AccuracyValidation';
import { TestResult } from './SearchTesting';

/**
 * Chart and visualization data generation utilities
 */
export class ChartDataGenerator {
  /**
   * Generate search-related charts
   */
  generateSearchCharts(metrics: SearchMetrics, results: any[]): ChartData[] {
    const charts: ChartData[] = [];

    // Metrics gauge chart
    charts.push({
      type: 'gauge',
      title: 'Search Quality Score',
      data: [(metrics.precision + metrics.recall + metrics.f1Score + metrics.relevanceScore) * 25],
    });

    // Content type distribution
    const contentTypes = this.getContentTypeDistribution(results);
    if (Object.keys(contentTypes).length > 0) {
      charts.push({
        type: 'pie',
        title: 'Content Type Distribution',
        data: Object.values(contentTypes),
        labels: Object.keys(contentTypes),
      });
    }

    // Section distribution
    const sections = this.getSectionDistribution(results);
    if (Object.keys(sections).length > 0) {
      charts.push({
        type: 'bar',
        title: 'Results by Section',
        data: Object.values(sections),
        labels: Object.keys(sections),
      });
    }

    // Metrics breakdown
    charts.push({
      type: 'bar',
      title: 'Search Metrics Breakdown',
      data: [
        metrics.precision * 100,
        metrics.recall * 100,
        metrics.f1Score * 100,
        metrics.relevanceScore * 100,
        metrics.diversityScore * 100,
      ],
      labels: ['Precision', 'Recall', 'F1 Score', 'Relevance', 'Diversity'],
    });

    return charts;
  }

  /**
   * Generate validation-related charts
   */
  generateValidationCharts(validationResult: ValidationResult): ChartData[] {
    const charts: ChartData[] = [];

    // Validation score gauge
    charts.push({
      type: 'gauge',
      title: 'Validation Score',
      data: [validationResult.score],
    });

    // Issues by category
    const issuesByCategory = this.groupIssuesByCategory(validationResult.issues);
    if (Object.keys(issuesByCategory).length > 0) {
      charts.push({
        type: 'bar',
        title: 'Issues by Category',
        data: Object.values(issuesByCategory).map((issues) => issues.length),
        labels: Object.keys(issuesByCategory),
      });
    }

    // Issues by severity
    const issuesBySeverity = this.groupIssuesBySeverity(validationResult.issues);
    if (Object.keys(issuesBySeverity).length > 0) {
      charts.push({
        type: 'pie',
        title: 'Issues by Severity',
        data: Object.values(issuesBySeverity).map((issues) => issues.length),
        labels: Object.keys(issuesBySeverity),
      });
    }

    return charts;
  }

  /**
   * Generate testing-related charts
   */
  generateTestingCharts(testResults: TestResult[]): ChartData[] {
    const charts: ChartData[] = [];

    // Pass rate by category
    const byCategory = this.groupTestsByCategory(testResults);
    const categories = Object.keys(byCategory);
    const passRates = categories.map(
      (cat) => (byCategory[cat].filter((r) => r.passed).length / byCategory[cat].length) * 100
    );

    if (categories.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Pass Rate by Query Type',
        data: passRates,
        labels: categories,
      });
    }

    // Overall pass/fail distribution
    const passedTests = testResults.filter((r) => r.passed).length;
    const failedTests = testResults.length - passedTests;

    charts.push({
      type: 'pie',
      title: 'Test Results Distribution',
      data: [passedTests, failedTests],
      labels: ['Passed', 'Failed'],
    });

    return charts;
  }

  /**
   * Generate comprehensive charts for combined analysis
   */
  generateComprehensiveCharts(
    searchMetrics: SearchMetrics[],
    validationResults: ValidationResult[],
    testResults: TestResult[]
  ): ChartData[] {
    const charts: ChartData[] = [];

    // Overall scores comparison
    const avgSearchScore = this.calculateAverageScore(
      searchMetrics.map((m) => (m.precision + m.recall + m.f1Score + m.relevanceScore) * 25)
    );
    const avgValidationScore = this.calculateAverageScore(validationResults.map((v) => v.score));
    const avgTestScore = this.calculateAverageScore(testResults.map((t) => t.score));

    charts.push({
      type: 'bar',
      title: 'Average Scores by Assessment Type',
      data: [avgSearchScore, avgValidationScore, avgTestScore],
      labels: ['Search Quality', 'Validation', 'Testing'],
    });

    return charts;
  }

  /**
   * Helper: Get content type distribution from results
   */
  private getContentTypeDistribution(results: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    results.forEach((r) => {
      const type = r.metadata?.contentType || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Helper: Get section distribution from results
   */
  private getSectionDistribution(results: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    results.forEach((r) => {
      const section = r.metadata?.sectionTitle || 'unknown';
      distribution[section] = (distribution[section] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Helper: Group issues by category
   */
  private groupIssuesByCategory(issues: any[]): Record<string, any[]> {
    return issues.reduce(
      (groups, issue) => {
        const category = issue.category || 'other';
        groups[category] = groups[category] || [];
        groups[category].push(issue);
        return groups;
      },
      {} as Record<string, any[]>
    );
  }

  /**
   * Helper: Group issues by severity
   */
  private groupIssuesBySeverity(issues: any[]): Record<string, any[]> {
    return issues.reduce(
      (groups, issue) => {
        const severity = issue.severity >= 8 ? 'high' : issue.severity >= 5 ? 'medium' : 'low';
        groups[severity] = groups[severity] || [];
        groups[severity].push(issue);
        return groups;
      },
      {} as Record<string, any[]>
    );
  }

  /**
   * Helper: Group tests by category
   */
  private groupTestsByCategory(testResults: TestResult[]): Record<string, TestResult[]> {
    return testResults.reduce(
      (groups, result) => {
        const category = result.testCase.expectedIntent;
        groups[category] = groups[category] || [];
        groups[category].push(result);
        return groups;
      },
      {} as Record<string, TestResult[]>
    );
  }

  /**
   * Helper: Calculate average score
   */
  private calculateAverageScore(scores: number[]): number {
    return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  }
}
