import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { DeepSummaryParams, PersonalizedContent } from './types';
import crypto from 'crypto';

/**
 * Summary Orchestrator
 * Handles personalized summaries and goal-oriented content
 */
export class SummaryOrchestrator {
  constructor(
    private cache: EnhancedAICache,
    private costTracker: CostTracker
  ) {}

  /**
   * Generate comprehensive personalized summary
   */
  async generateDeepSummary(params: DeepSummaryParams): Promise<PersonalizedContent> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const contentHash = crypto.createHash('sha256')
        .update(params.content)
        .digest('hex')
        .substring(0, 16);

      const cached = await this.cache.get({
        service: 'summary',
        userId: params.persona.userId,
        contentHash,
        persona: params.persona,
        context: {
          format: params.format,
          difficulty: 'comprehensive'
        }
      });

      if (cached) {
        return {
          content: cached.content,
          personalizationScore: cached.metadata?.personalizationScore || 0.8,
          qualityMetrics: {
            naturalIntegration: 0.8,
            educationalIntegrity: 0.9,
            relevanceEngagement: 0.7,
            flowReadability: 0.8,
          },
          cached: true,
        };
      }

      const interests = [
        ...(params.persona.primaryInterests || []),
        ...(params.persona.secondaryInterests || []),
      ];

      let prompt = `Create a ${params.format} summary of:\n\n${params.content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Connect to their interests naturally when relevant.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1200,
      });

      const summary = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(summary, params.persona);
      
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      };

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: 'SUMMARIZE' as any,
        model: params.model || 'gpt-4o',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache result
      await this.cache.set(
        {
          service: 'summary',
          userId: params.persona.userId,
          contentHash,
          persona: params.persona,
          context: {
            format: params.format,
            difficulty: 'comprehensive'
          }
        },
        summary,
        usage,
        {
          format: params.format,
          personalizationScore: validation.score,
          contentLength: params.content.length
        }
      );

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics: {
          naturalIntegration: 0.8,
          educationalIntegrity: 0.9,
          relevanceEngagement: 0.7,
          flowReadability: 0.8,
        },
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate deep summary:', error);
      throw error;
    }
  }

  /**
   * Generate goal-oriented summary
   */
  async generateGoalOrientedSummary(
    content: string,
    persona: UserPersona,
    summaryPurpose: 'review' | 'application' | 'next-steps' | 'connections' = 'review'
  ): Promise<PersonalizedContent> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const contentHash = crypto.createHash('sha256')
        .update(content + summaryPurpose)
        .digest('hex')
        .substring(0, 16);

      const cached = await this.cache.get({
        service: 'summary',
        userId: persona.userId,
        contentHash,
        persona,
        context: {
          format: summaryPurpose,
          difficulty: 'goal-oriented'
        }
      });

      if (cached) {
        return {
          content: cached.content,
          personalizationScore: cached.metadata?.personalizationScore || 0.8,
          qualityMetrics: {
            naturalIntegration: 0.8,
            educationalIntegrity: 0.9,
            relevanceEngagement: 0.8,
            flowReadability: 0.8,
          },
          cached: true,
        };
      }

      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Create a ${summaryPurpose}-focused summary of:\n\n${content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Focus on ${summaryPurpose} aspects, connecting to their interests naturally.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const summary = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(summary, persona);
      
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      };

      // Track cost
      await this.costTracker.trackRequest({
        userId: persona.userId,
        requestType: 'SUMMARIZE' as any,
        model: 'gpt-4o',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache result
      await this.cache.set(
        {
          service: 'summary',
          userId: persona.userId,
          contentHash,
          persona,
          context: {
            format: summaryPurpose,
            difficulty: 'goal-oriented'
          }
        },
        summary,
        usage,
        {
          purpose: summaryPurpose,
          personalizationScore: validation.score,
          contentLength: content.length
        }
      );

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics: {
          naturalIntegration: 0.8,
          educationalIntegrity: 0.9,
          relevanceEngagement: 0.8,
          flowReadability: 0.8,
        },
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate goal-oriented summary:', error);
      throw error;
    }
  }
}
