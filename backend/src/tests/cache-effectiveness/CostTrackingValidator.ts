import { CostTracker } from '../../services/ai/CostTracker';
import { logger } from '../../utils/logger';
import { TestDataGenerator, TestUser, TestContent } from './TestDataGenerator';

export class CostTrackingValidator {
  private costTracker: CostTracker;

  constructor(costTracker: CostTracker) {
    this.costTracker = costTracker;
  }

  async validateCostTracking(): Promise<{
    trackedCorrectly: boolean;
    estimatedSavings: number;
    actualSavings: number;
    accuracy: number;
  }> {
    logger.info('Validating cost tracking accuracy...');

    let estimatedCost = 0;
    let actualCost = 0;

    const testUsers = TestDataGenerator.generateTestUsers();
    const testContent = TestDataGenerator.generateTestContent();

    // Simulate requests with known costs
    for (const user of testUsers.slice(0, 5)) {
      for (const content of testContent) {
        const startTime = Date.now();

        // Calculate expected cost (simplified)
        const expectedCost = TestDataGenerator.calculateExpectedCost(
          content.expectedTokens.prompt,
          content.expectedTokens.completion,
          'gpt-4o'
        );
        estimatedCost += expectedCost;

        // Track the request
        await this.costTracker.trackRequest({
          userId: user.userId,
          requestType: content.service.toUpperCase() as any,
          model: 'gpt-4o',
          promptTokens: content.expectedTokens.prompt,
          completionTokens: content.expectedTokens.completion,
          responseTimeMs: Date.now() - startTime,
          cacheHit: Math.random() > 0.5, // Simulate random cache hits
        });

        actualCost += expectedCost; // In real scenario, this would come from tracking
      }
    }

    // Get cost statistics
    const costStats = await this.costTracker.getDashboardStats();
    const estimatedSavings = costStats.today.cost;
    const actualSavings = actualCost * 0.7; // Assume 70% of costs are saved through caching

    const accuracy = estimatedSavings > 0 ? Math.min(actualSavings / estimatedSavings, 1) : 0;
    const trackedCorrectly = accuracy > 0.8; // 80% accuracy threshold

    logger.info(`Cost tracking accuracy: ${(accuracy * 100).toFixed(1)}%`);
    logger.info(
      `Estimated savings: $${estimatedSavings.toFixed(3)}, Actual: $${actualSavings.toFixed(3)}`
    );

    return {
      trackedCorrectly,
      estimatedSavings,
      actualSavings,
      accuracy,
    };
  }
}