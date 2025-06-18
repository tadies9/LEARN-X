import { ValidationResult } from './AccuracyValidation';
import { TestResult } from './SearchTesting';
import { AccuracyReport, ReportSummary, ReportGenerator } from './ReportGenerator';
import { ChartDataGenerator } from './ChartDataGenerator';

/**
 * Validation report generation functionality
 */
export class ValidationReports {
  private reportGenerator: ReportGenerator;
  private chartGenerator: ChartDataGenerator;

  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.chartGenerator = new ChartDataGenerator();
  }

  /**
   * Generate validation report from validation results
   */
  generateValidationReport(validationResult: ValidationResult): AccuracyReport {
    const summary: ReportSummary = {
      overallScore: validationResult.score,
      status: this.reportGenerator.getStatusFromScore(validationResult.score),
      keyMetrics: {
        validationScore: validationResult.score,
        issueCount: validationResult.issues.length,
        errorCount: validationResult.issues.filter((i) => i.type === 'error').length,
        warningCount: validationResult.issues.filter((i) => i.type === 'warning').length,
      },
      criticalIssues: validationResult.issues.filter((i) => i.severity >= 8).length,
      improvements: validationResult.recommendations.slice(0, 3),
    };

    const details = {
      isValid: validationResult.isValid,
      issues: validationResult.issues,
      issuesByCategory: this.groupIssuesByCategory(validationResult.issues),
      issuesBySeverity: this.groupIssuesBySeverity(validationResult.issues),
      detailedAnalysis: this.analyzeValidationDetails(validationResult),
    };

    const charts = this.chartGenerator.generateValidationCharts(validationResult);

    return this.reportGenerator.createReport(
      'validation',
      summary,
      details,
      validationResult.recommendations,
      charts
    );
  }

  /**
   * Generate testing report from test results
   */
  generateTestingReport(testResults: TestResult[]): AccuracyReport {
    const passedTests = testResults.filter((r) => r.passed).length;
    const totalTests = testResults.length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const averageScore =
      totalTests > 0 ? testResults.reduce((sum, r) => sum + r.score, 0) / totalTests : 0;

    const summary: ReportSummary = {
      overallScore: averageScore,
      status: this.reportGenerator.getStatusFromScore(averageScore),
      keyMetrics: {
        passRate,
        averageScore,
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
      },
      criticalIssues: testResults.filter((r) => !r.passed).length,
      improvements: this.extractCommonIssues(testResults).slice(0, 3),
    };

    const details = {
      testResults,
      resultsByCategory: this.groupTestsByCategory(testResults),
      commonIssues: this.extractCommonIssues(testResults),
      performanceAnalysis: this.analyzeTestPerformance(testResults),
      failureAnalysis: this.analyzeFailures(testResults),
    };

    const charts = this.chartGenerator.generateTestingCharts(testResults);

    return this.reportGenerator.createReport(
      'testing',
      summary,
      details,
      this.generateTestingRecommendations(testResults),
      charts
    );
  }

  /**
   * Group issues by category
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
   * Group issues by severity level
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
   * Analyze validation details for deeper insights
   */
  private analyzeValidationDetails(validationResult: ValidationResult): any {
    const issuesByCategory = this.groupIssuesByCategory(validationResult.issues);
    const issuesBySeverity = this.groupIssuesBySeverity(validationResult.issues);

    return {
      issueDistribution: {
        byCategory: Object.fromEntries(
          Object.entries(issuesByCategory).map(([cat, issues]) => [cat, issues.length])
        ),
        bySeverity: Object.fromEntries(
          Object.entries(issuesBySeverity).map(([sev, issues]) => [sev, issues.length])
        ),
      },
      riskLevel: this.assessRiskLevel(validationResult),
    };
  }

  /**
   * Assess basic risk level
   */
  private assessRiskLevel(
    validationResult: ValidationResult
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalIssues = validationResult.issues.filter((i) => i.severity >= 8).length;
    const totalIssues = validationResult.issues.length;

    if (criticalIssues > 0) return 'critical';
    if (validationResult.score < 50) return 'high';
    if (totalIssues > 10) return 'medium';
    return 'low';
  }

  /**
   * Group test results by category
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
   * Extract common issues from test results
   */
  private extractCommonIssues(testResults: TestResult[]): string[] {
    const issueCount = new Map<string, number>();
    testResults.forEach((result) => {
      result.issues.forEach((issue) => {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
      });
    });

    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);
  }

  /**
   * Analyze test performance by category
   */
  private analyzeTestPerformance(testResults: TestResult[]): any {
    const byCategory = this.groupTestsByCategory(testResults);
    const analysis: any = {};

    Object.entries(byCategory).forEach(([category, results]) => {
      const passRate = (results.filter((r) => r.passed).length / results.length) * 100;
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

      analysis[category] = {
        passRate,
        avgScore,
        totalTests: results.length,
      };
    });

    return analysis;
  }

  /**
   * Analyze test failures for patterns
   */
  private analyzeFailures(testResults: TestResult[]): any {
    const failures = testResults.filter((r) => !r.passed);

    if (failures.length === 0) {
      return { hasFailures: false };
    }

    const failuresByCategory = this.groupTestsByCategory(failures);
    const failureRate = (failures.length / testResults.length) * 100;

    return {
      hasFailures: true,
      failureRate,
      totalFailures: failures.length,
      failuresByCategory: Object.fromEntries(
        Object.entries(failuresByCategory).map(([cat, fails]) => [cat, fails.length])
      ),
      commonFailureReasons: this.extractCommonIssues(failures),
      avgFailureScore: failures.reduce((sum, f) => sum + f.score, 0) / failures.length,
    };
  }

  /**
   * Generate testing-specific recommendations
   */
  private generateTestingRecommendations(testResults: TestResult[]): string[] {
    const recommendations: string[] = [];
    const commonIssues = this.extractCommonIssues(testResults);
    const passRate = (testResults.filter((r) => r.passed).length / testResults.length) * 100;

    if (passRate < 70) {
      recommendations.push('Overall test pass rate is below 70% - comprehensive review needed');
    }

    commonIssues.forEach((issue) => {
      if (issue.includes('intent')) {
        recommendations.push('Improve query intent detection accuracy');
      } else if (issue.includes('relevance')) {
        recommendations.push('Enhance relevance scoring for better result quality');
      } else if (issue.includes('content type')) {
        recommendations.push('Improve content type classification and matching');
      } else if (issue.includes('ranking')) {
        recommendations.push('Optimize result ranking algorithm');
      }
    });

    const failureAnalysis = this.analyzeFailures(testResults);
    if (failureAnalysis.hasFailures && failureAnalysis.failureRate > 30) {
      recommendations.push('High failure rate detected - focus on most common failure categories');
    }

    return Array.from(new Set(recommendations)).slice(0, 8);
  }
}
