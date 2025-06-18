import { logger } from '../../utils/logger';
import { QueryIntent } from './AccuracyCalculator';

export interface TestCase {
  id: string;
  query: string;
  expectedIntent: QueryIntent['type'];
  expectedResultCount: number;
  expectedContentTypes: string[];
  expectedConcepts: string[];
  minRelevanceScore: number;
  description: string;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actualResults: any[];
  actualIntent: QueryIntent;
  metrics: any;
  issues: string[];
  score: number;
}

export interface TestSuite {
  name: string;
  description: string;
  testCases: TestCase[];
}

export class SearchTesting {
  private testSuites: Map<string, TestSuite> = new Map();

  /**
   * Generate comprehensive test cases for search accuracy
   */
  generateTestCases(): TestCase[] {
    const testCases: TestCase[] = [
      // Definition queries
      {
        id: 'def-ml-basic',
        query: 'What is machine learning?',
        expectedIntent: 'definition',
        expectedResultCount: 5,
        expectedContentTypes: ['definition', 'key-concept'],
        expectedConcepts: ['machine learning'],
        minRelevanceScore: 0.8,
        description: 'Basic definition query for machine learning',
      },
      {
        id: 'def-neural-network',
        query: 'Define neural network',
        expectedIntent: 'definition',
        expectedResultCount: 5,
        expectedContentTypes: ['definition', 'key-concept'],
        expectedConcepts: ['neural network'],
        minRelevanceScore: 0.8,
        description: 'Definition query for neural networks',
      },

      // Explanation queries
      {
        id: 'exp-gradient-descent',
        query: 'How does gradient descent work?',
        expectedIntent: 'explanation',
        expectedResultCount: 8,
        expectedContentTypes: ['explanation', 'theory'],
        expectedConcepts: ['gradient descent', 'optimization'],
        minRelevanceScore: 0.7,
        description: 'Explanation query for gradient descent algorithm',
      },
      {
        id: 'exp-backprop',
        query: 'Explain backpropagation',
        expectedIntent: 'explanation',
        expectedResultCount: 8,
        expectedContentTypes: ['explanation', 'theory'],
        expectedConcepts: ['backpropagation', 'neural network'],
        minRelevanceScore: 0.7,
        description: 'Explanation query for backpropagation',
      },

      // Example queries
      {
        id: 'ex-classification',
        query: 'Give me examples of classification algorithms',
        expectedIntent: 'example',
        expectedResultCount: 10,
        expectedContentTypes: ['example', 'practice'],
        expectedConcepts: ['classification', 'algorithm'],
        minRelevanceScore: 0.6,
        description: 'Example query for classification algorithms',
      },
      {
        id: 'ex-regression',
        query: 'Show me regression examples',
        expectedIntent: 'example',
        expectedResultCount: 8,
        expectedContentTypes: ['example', 'practice'],
        expectedConcepts: ['regression'],
        minRelevanceScore: 0.6,
        description: 'Example query for regression techniques',
      },

      // Comparison queries
      {
        id: 'comp-supervised-unsupervised',
        query: 'Difference between supervised and unsupervised learning',
        expectedIntent: 'comparison',
        expectedResultCount: 12,
        expectedContentTypes: ['comparison', 'explanation'],
        expectedConcepts: ['supervised learning', 'unsupervised learning'],
        minRelevanceScore: 0.7,
        description: 'Comparison query for learning types',
      },
      {
        id: 'comp-cnn-rnn',
        query: 'Compare CNN versus RNN',
        expectedIntent: 'comparison',
        expectedResultCount: 10,
        expectedContentTypes: ['comparison', 'explanation'],
        expectedConcepts: ['cnn', 'rnn', 'neural network'],
        minRelevanceScore: 0.7,
        description: 'Comparison query for neural network architectures',
      },

      // How-to queries
      {
        id: 'howto-train-model',
        query: 'How to train a machine learning model',
        expectedIntent: 'how-to',
        expectedResultCount: 12,
        expectedContentTypes: ['practice', 'example', 'steps'],
        expectedConcepts: ['training', 'model', 'machine learning'],
        minRelevanceScore: 0.6,
        description: 'How-to query for model training',
      },
      {
        id: 'howto-implement-nn',
        query: 'Steps to implement neural network',
        expectedIntent: 'how-to',
        expectedResultCount: 10,
        expectedContentTypes: ['practice', 'example', 'steps'],
        expectedConcepts: ['neural network', 'implementation'],
        minRelevanceScore: 0.6,
        description: 'How-to query for neural network implementation',
      },

      // General queries
      {
        id: 'gen-deep-learning',
        query: 'deep learning applications',
        expectedIntent: 'general',
        expectedResultCount: 15,
        expectedContentTypes: ['explanation', 'example', 'practice'],
        expectedConcepts: ['deep learning'],
        minRelevanceScore: 0.5,
        description: 'General query about deep learning applications',
      },
    ];

    return testCases;
  }

  /**
   * Create test suite for specific domain
   */
  createTestSuite(name: string, description: string, testCases: TestCase[]): void {
    this.testSuites.set(name, {
      name,
      description,
      testCases,
    });

    logger.info(`[SearchTesting] Created test suite: ${name} with ${testCases.length} test cases`);
  }

  /**
   * Execute test case against search service
   */
  async executeTestCase(
    testCase: TestCase,
    searchFunction: (query: string, userId: string) => Promise<any>
  ): Promise<TestResult> {
    logger.info(`[SearchTesting] Executing test case: ${testCase.id}`);

    try {
      // Execute search
      const searchResult = await searchFunction(testCase.query, 'test-user');
      const { results, intent, metrics } = searchResult;

      // Validate results
      const issues: string[] = [];
      let score = 100;

      // Check intent detection
      if (intent.type !== testCase.expectedIntent) {
        issues.push(`Expected intent '${testCase.expectedIntent}', got '${intent.type}'`);
        score -= 20;
      }

      // Check result count
      if (results.length < testCase.expectedResultCount * 0.8) {
        issues.push(
          `Expected at least ${testCase.expectedResultCount * 0.8} results, got ${results.length}`
        );
        score -= 15;
      }

      // Check content types
      const hasExpectedContentTypes = testCase.expectedContentTypes.some((type) =>
        results.some((r: any) => r.metadata.contentType === type)
      );
      if (!hasExpectedContentTypes) {
        issues.push(
          `No results with expected content types: ${testCase.expectedContentTypes.join(', ')}`
        );
        score -= 20;
      }

      // Check concepts
      const hasExpectedConcepts = testCase.expectedConcepts.some((concept: string) =>
        intent.concepts.some((c: string) => c.toLowerCase().includes(concept.toLowerCase()))
      );
      if (!hasExpectedConcepts) {
        issues.push(`Expected concepts not detected: ${testCase.expectedConcepts.join(', ')}`);
        score -= 15;
      }

      // Check relevance score
      if (metrics.relevanceScore < testCase.minRelevanceScore) {
        issues.push(
          `Relevance score ${metrics.relevanceScore.toFixed(2)} below minimum ${testCase.minRelevanceScore}`
        );
        score -= 20;
      }

      // Check for high-quality results in top positions
      const topResults = results.slice(0, 3);
      const highQualityCount = topResults.filter((r: any) => r.relevanceScore > 0.7).length;
      if (highQualityCount === 0) {
        issues.push('No high-quality results in top 3 positions');
        score -= 10;
      }

      return {
        testCase,
        passed: issues.length === 0,
        actualResults: results,
        actualIntent: intent,
        metrics,
        issues,
        score: Math.max(0, score),
      };
    } catch (error) {
      logger.error(`[SearchTesting] Test case failed: ${testCase.id}`, error);

      return {
        testCase,
        passed: false,
        actualResults: [],
        actualIntent: { type: 'general', keywords: [], concepts: [], expectedContentTypes: [] },
        metrics: {},
        issues: [`Test execution failed: ${error}`],
        score: 0,
      };
    }
  }

  /**
   * Execute full test suite
   */
  async executeTestSuite(
    suiteName: string,
    searchFunction: (query: string, userId: string) => Promise<any>
  ): Promise<TestResult[]> {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteName}`);
    }

    logger.info(
      `[SearchTesting] Executing test suite: ${suiteName} (${suite.testCases.length} cases)`
    );

    const results: TestResult[] = [];

    for (const testCase of suite.testCases) {
      const result = await this.executeTestCase(testCase, searchFunction);
      results.push(result);

      // Small delay between tests to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Generate test case based on query patterns
   */
  generateTestCaseFromQuery(query: string, expectedIntent?: QueryIntent['type']): TestCase {
    const id = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Analyze query to determine expected values
    const lowerQuery = query.toLowerCase();
    let intent: QueryIntent['type'] = expectedIntent || 'general';
    let expectedContentTypes: string[] = [];
    let expectedConcepts: string[] = [];
    let minRelevanceScore = 0.5;
    let expectedResultCount = 10;

    // Intent detection
    if (!expectedIntent) {
      if (lowerQuery.includes('what is') || lowerQuery.includes('define')) {
        intent = 'definition';
        expectedContentTypes = ['definition', 'key-concept'];
        minRelevanceScore = 0.8;
        expectedResultCount = 5;
      } else if (lowerQuery.includes('explain') || lowerQuery.includes('how does')) {
        intent = 'explanation';
        expectedContentTypes = ['explanation', 'theory'];
        minRelevanceScore = 0.7;
        expectedResultCount = 8;
      } else if (lowerQuery.includes('example') || lowerQuery.includes('show me')) {
        intent = 'example';
        expectedContentTypes = ['example', 'practice'];
        minRelevanceScore = 0.6;
        expectedResultCount = 10;
      } else if (lowerQuery.includes('difference') || lowerQuery.includes('compare')) {
        intent = 'comparison';
        expectedContentTypes = ['comparison', 'explanation'];
        minRelevanceScore = 0.7;
        expectedResultCount = 12;
      } else if (lowerQuery.includes('how to') || lowerQuery.includes('steps')) {
        intent = 'how-to';
        expectedContentTypes = ['practice', 'example', 'steps'];
        minRelevanceScore = 0.6;
        expectedResultCount = 12;
      }
    }

    // Extract likely concepts (simplified)
    const technicalTerms = [
      'machine learning',
      'neural network',
      'deep learning',
      'algorithm',
      'classification',
      'regression',
    ];
    expectedConcepts = technicalTerms.filter((term) => query.toLowerCase().includes(term));

    return {
      id,
      query,
      expectedIntent: intent,
      expectedResultCount,
      expectedContentTypes,
      expectedConcepts,
      minRelevanceScore,
      description: `Generated test case for query: "${query}"`,
    };
  }

  /**
   * Get test suite by name
   */
  getTestSuite(name: string): TestSuite | undefined {
    return this.testSuites.get(name);
  }

  /**
   * List all test suites
   */
  listTestSuites(): string[] {
    return Array.from(this.testSuites.keys());
  }

  /**
   * Calculate test suite summary statistics
   */
  calculateTestSuiteStats(results: TestResult[]): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    averageScore: number;
    commonIssues: string[];
  } {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const averageScore =
      totalTests > 0 ? results.reduce((sum, r) => sum + r.score, 0) / totalTests : 0;

    // Count common issues
    const issueCount = new Map<string, number>();
    results.forEach((result) => {
      result.issues.forEach((issue) => {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
      });
    });

    const commonIssues = Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      averageScore,
      commonIssues,
    };
  }
}
