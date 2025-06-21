import { getEnhancedAICache } from '../../services/cache/EnhancedAICache';
import { CostTracker } from '../../services/ai/CostTracker';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';
import { TestDataGenerator, TestUser, TestContent } from './TestDataGenerator';

export class CacheEffectivenessTests {
  private cache = getEnhancedAICache(redisClient, new CostTracker());

  async testCacheEffectiveness(): Promise<{
    hitRate: number;
    targetHitRate: number;
    passed: boolean;
  }> {
    logger.info('Testing cache effectiveness...');

    const targetHitRate = 0.75; // 75% target hit rate
    let totalRequests = 0;
    let cacheHits = 0;

    const testUsers = TestDataGenerator.generateTestUsers();
    const testContent = TestDataGenerator.generateTestContent();

    // Simulate realistic usage patterns
    for (let round = 0; round < 3; round++) {
      for (const user of testUsers.slice(0, 10)) {
        for (const content of testContent) {
          totalRequests++;

          const contentHash = TestDataGenerator.generateContentHash(content.content);

          // Try to get from cache first
          const cached = await this.cache.get({
            service: content.service,
            userId: user.userId,
            contentHash,
            persona: user.persona,
            context: {
              difficulty: 'intermediate',
              format: 'standard',
            },
          });

          if (cached) {
            cacheHits++;
          } else {
            // Simulate cache miss - store in cache
            await this.cache.set(
              {
                service: content.service,
                userId: user.userId,
                contentHash,
                persona: user.persona,
                context: {
                  difficulty: 'intermediate',
                  format: 'standard',
                },
              },
              `Generated ${content.service} content for ${user.persona.currentRole}`,
              {
                promptTokens: content.expectedTokens.prompt,
                completionTokens: content.expectedTokens.completion,
              },
              {
                round,
                contentType: content.service,
                userRole: user.persona.currentRole,
              }
            );
          }

          // Small delay to simulate realistic usage
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }

    const hitRate = cacheHits / totalRequests;
    const passed = hitRate >= targetHitRate;

    logger.info(
      `Cache effectiveness: ${(hitRate * 100).toFixed(1)}% hit rate (target: ${(targetHitRate * 100).toFixed(1)}%)`
    );

    return {
      hitRate,
      targetHitRate,
      passed,
    };
  }

  async testPersonalizationEffectiveness(): Promise<{
    personalizedHitRate: number;
    genericHitRate: number;
    personalizationBenefit: number;
  }> {
    logger.info('Testing personalization effectiveness...');

    const genericPersona = TestDataGenerator.generateGenericPersona();
    const testUsers = TestDataGenerator.generateTestUsers();
    const testContent = TestDataGenerator.generateTestContent();

    let personalizedHits = 0;
    let personalizedTotal = 0;
    let genericHits = 0;
    let genericTotal = 0;

    // Test personalized caching
    for (const user of testUsers.slice(0, 5)) {
      for (const content of testContent) {
        personalizedTotal++;

        const contentHash = TestDataGenerator.generateContentHash(content.content + 'personalized');

        // First request - should be a miss
        let cached = await this.cache.get({
          service: content.service,
          userId: user.userId,
          contentHash,
          persona: user.persona,
          context: { difficulty: 'intermediate', format: 'personalized' },
        });

        if (!cached) {
          await this.cache.set(
            {
              service: content.service,
              userId: user.userId,
              contentHash,
              persona: user.persona,
              context: { difficulty: 'intermediate', format: 'personalized' },
            },
            `Personalized ${content.service} for ${user.persona.currentRole}`,
            {
              promptTokens: content.expectedTokens.prompt,
              completionTokens: content.expectedTokens.completion,
            }
          );
        }

        // Second request - should be a hit
        cached = await this.cache.get({
          service: content.service,
          userId: user.userId,
          contentHash,
          persona: user.persona,
          context: { difficulty: 'intermediate', format: 'personalized' },
        });

        if (cached) personalizedHits++;
      }
    }

    // Test generic caching
    for (let i = 0; i < 15; i++) {
      // Same number of requests as personalized
      const content = testContent[i % testContent.length];
      genericTotal++;

      const contentHash = TestDataGenerator.generateContentHash(content.content + 'generic');

      const cached = await this.cache.get({
        service: content.service,
        userId: 'generic-user',
        contentHash,
        persona: genericPersona,
        context: { difficulty: 'intermediate', format: 'generic' },
      });

      if (!cached) {
        await this.cache.set(
          {
            service: content.service,
            userId: 'generic-user',
            contentHash,
            persona: genericPersona,
            context: { difficulty: 'intermediate', format: 'generic' },
          },
          `Generic ${content.service} content`,
          {
            promptTokens: content.expectedTokens.prompt,
            completionTokens: content.expectedTokens.completion,
          }
        );
      } else {
        genericHits++;
      }
    }

    const personalizedHitRate = personalizedHits / personalizedTotal;
    const genericHitRate = genericHits / genericTotal;
    const personalizationBenefit = personalizedHitRate - genericHitRate;

    logger.info(`Personalized hit rate: ${(personalizedHitRate * 100).toFixed(1)}%`);
    logger.info(`Generic hit rate: ${(genericHitRate * 100).toFixed(1)}%`);
    logger.info(`Personalization benefit: ${(personalizationBenefit * 100).toFixed(1)}%`);

    return {
      personalizedHitRate,
      genericHitRate,
      personalizationBenefit,
    };
  }
}