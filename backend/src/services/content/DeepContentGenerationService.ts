import { openAIService } from '../openai/OpenAIService';
import { deepPromptTemplates } from '../ai/DeepPromptTemplates';
import { deepPersonalizationEngine } from '../personalization/DeepPersonalizationEngine';
import { AICache } from '../cache/AICache';
import { CostTracker } from '../ai/CostTracker';
import { TokenCounter } from '../ai/TokenCounter';
import { logger } from '../../utils/logger';
import { AIRequestType, GenerationParams } from '../../types/ai';
import { UserPersona } from '../../types/persona';
import Redis from 'ioredis';

export interface DeepExplanationParams extends GenerationParams {
  chunks: Array<{ id: string; content: string; metadata?: any }>;
  topic: string;
  subtopic?: string;
  persona: UserPersona;
}

export interface DeepSummaryParams extends GenerationParams {
  content: string;
  format: 'key-points' | 'comprehensive' | 'visual-map';
  persona: UserPersona;
}

export interface PersonalizedContent {
  content: string;
  personalizationScore: number;
  qualityMetrics: {
    naturalIntegration: number;
    educationalIntegrity: number;
    relevanceEngagement: number;
    flowReadability: number;
  };
  cached: boolean;
}

/**
 * Deep Content Generation Service
 * Creates educational content with seamless, natural personalization
 */
export class DeepContentGenerationService {
  private cache: AICache;
  private costTracker: CostTracker;

  constructor(redis: Redis) {
    this.cache = new AICache(redis);
    this.costTracker = new CostTracker();
  }

  /**
   * Generate deeply personalized explanation with streaming
   */
  async *generateDeepExplanation(params: DeepExplanationParams): AsyncGenerator<string> {
    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(params);
      const cached = await this.cache.getCachedExplanation(
        cacheKey,
        params.topic,
        params.persona.userId
      );

      if (cached) {
        // Stream cached content
        for (const chunk of this.chunkContent(cached.content)) {
          yield chunk;
          await this.delay(50); // Simulate streaming
        }
        return;
      }

      // Build deeply personalized prompt
      const content = params.chunks.map(c => c.content).join('\n\n');
      const prompt = deepPromptTemplates.buildStreamingExplanationPrompt(
        params.persona,
        params.chunks,
        params.topic
      );
      
      promptTokens = TokenCounter.countTokens(prompt, params.model);

      // Create streaming completion with enhanced parameters
      const stream = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a master educator who creates seamlessly personalized explanations that feel naturally written for each learner.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: this.getOptimalTemperature(params.persona),
        max_tokens: this.getOptimalMaxTokens(params.persona, content),
        presence_penalty: 0.1, // Encourage fresh language
        frequency_penalty: 0.1, // Reduce repetition
      });

      let fullContent = '';
      let chunkBuffer = '';

      // Stream with intelligent chunking
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          chunkBuffer += content;

          // Yield complete sentences when possible
          if (content.match(/[.!?]\s/) && chunkBuffer.length > 50) {
            yield chunkBuffer;
            chunkBuffer = '';
          }
        }
      }

      // Yield any remaining content
      if (chunkBuffer) {
        yield chunkBuffer;
      }

      // Calculate completion tokens
      completionTokens = TokenCounter.countTokens(fullContent, params.model);

      // Validate personalization quality
      const validation = deepPersonalizationEngine.validatePersonalization(
        fullContent,
        params.persona
      );

      // Log quality metrics
      logger.info('Personalization quality:', {
        userId: params.persona.userId,
        topic: params.topic,
        score: validation.score,
        issues: validation.issues
      });

      // Track cost and performance
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: AIRequestType.EXPLAIN,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
        metadata: {
          personalizationScore: validation.score,
          primaryLens: deepPersonalizationEngine.getPrimaryLens(params.persona)
        }
      });

      // Cache high-quality results
      if (validation.score >= 80) {
        await this.cache.setCachedExplanation(
          cacheKey,
          params.topic,
          params.persona.userId,
          fullContent,
          { 
            promptTokens, 
            completionTokens, 
            personalizationScore: validation.score 
          }
        );
      }

    } catch (error) {
      logger.error('Failed to generate deep explanation:', error);
      throw error;
    }
  }

  /**
   * Generate deeply personalized summary
   */
  async generateDeepSummary(params: DeepSummaryParams): Promise<PersonalizedContent> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.generateSummaryCacheKey(params);
      const cached = await this.cache.getCachedSummary(
        cacheKey,
        params.format,
        params.persona.userId
      );

      if (cached) {
        return {
          content: cached.content,
          personalizationScore: (cached as any).personalizationScore || 85,
          qualityMetrics: (cached as any).qualityMetrics || this.getDefaultQualityMetrics(),
          cached: true
        };
      }

      // Generate personalized summary
      const prompt = deepPromptTemplates.buildDeepSummaryPrompt(
        params.persona,
        params.content,
        params.format
      );

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Create a naturally personalized summary that integrates the learner\'s interests seamlessly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.getOptimalTemperature(params.persona),
        max_tokens: this.getSummaryMaxTokens(params.format, params.persona.contentDensity),
      });

      const summary = response.choices[0].message.content || '';
      
      // Validate quality
      const validation = deepPersonalizationEngine.validatePersonalization(
        summary,
        params.persona
      );

      const qualityMetrics = await this.evaluateQualityMetrics(
        params.content,
        summary,
        params.persona
      );

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: AIRequestType.SUMMARIZE,
        model: params.model || 'gpt-4o',
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        responseTimeMs: Date.now() - startTime,
        metadata: {
          personalizationScore: validation.score,
          format: params.format
        }
      });

      // Cache high-quality results
      if (validation.score >= 80) {
        await this.cache.setCachedSummary(
          cacheKey,
          params.format,
          params.persona.userId,
          summary,
          { 
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            personalizationScore: validation.score,
            qualityMetrics
          }
        );
      }

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false
      };

    } catch (error) {
      logger.error('Failed to generate deep summary:', error);
      throw error;
    }
  }

  /**
   * Generate personalized examples for a concept
   */
  async generatePersonalizedExamples(
    concept: string,
    persona: UserPersona,
    count: number = 3
  ): Promise<string[]> {
    try {
      const prompt = deepPromptTemplates.buildDeepExamplesPrompt(persona, concept);

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Generate concrete, relevant examples that naturally illustrate concepts using scenarios from the learner\'s world.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8, // Higher creativity for examples
        max_tokens: 800,
      });

      const content = response.choices[0].message.content || '';
      
      // Parse examples from response
      const examples = this.parseExamples(content, count);
      
      return examples;

    } catch (error) {
      logger.error('Failed to generate personalized examples:', error);
      return [`Example of ${concept} in your field...`]; // Fallback
    }
  }

  /**
   * Stream personalized chat response
   */
  async *streamPersonalizedChat(params: {
    message: string;
    context: string[];
    currentPage?: number;
    selectedText?: string;
    persona: UserPersona;
    model?: string;
  }): AsyncGenerator<string> {
    try {
      const prompt = deepPromptTemplates.buildPersonalizedChatPrompt(
        params.persona,
        params.message,
        params.context,
        params.currentPage,
        params.selectedText
      );

      const stream = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: params.message,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield content;
        }
      }

      // Track usage
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: 'CHAT' as any,
        model: params.model || 'gpt-4o',
        promptTokens: TokenCounter.countTokens(prompt, params.model),
        completionTokens: TokenCounter.countTokens(fullContent, params.model),
        responseTimeMs: Date.now(),
      });

    } catch (error) {
      logger.error('Failed to stream personalized chat:', error);
      throw error;
    }
  }

  // Helper methods

  private generateCacheKey(params: DeepExplanationParams): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(params.persona);
    return `deep_explanation_${params.topic}_${primaryLens}_${params.persona.technicalLevel}`;
  }

  private generateSummaryCacheKey(params: DeepSummaryParams): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(params.persona);
    const contentHash = this.hashContent(params.content);
    return `deep_summary_${contentHash}_${params.format}_${primaryLens}`;
  }

  private hashContent(content: string): string {
    // Simple hash for cache key
    return content.substring(0, 50).replace(/\s+/g, '_');
  }

  private getOptimalTemperature(persona: UserPersona): number {
    // Adjust temperature based on persona preferences
    if (persona.communicationTone === 'creative' || persona.communicationTone === 'casual') {
      return 0.8;
    }
    if (persona.communicationTone === 'formal' || persona.communicationTone === 'academic') {
      return 0.5;
    }
    return 0.7; // Default
  }

  private getOptimalMaxTokens(persona: UserPersona, content: string): number {
    const baseTokens = Math.min(content.length / 2, 2000); // Rough estimate
    
    if (persona.contentDensity === 'comprehensive') {
      return Math.min(baseTokens * 1.5, 3000);
    }
    if (persona.contentDensity === 'concise') {
      return Math.min(baseTokens * 0.8, 1500);
    }
    
    return Math.min(baseTokens, 2000);
  }

  private getSummaryMaxTokens(format: string, density?: string): number {
    const formatTokens = {
      'key-points': 800,
      'comprehensive': 1500,
      'visual-map': 1000
    };

    const baseTokens = formatTokens[format as keyof typeof formatTokens] || 1000;
    
    if (density === 'comprehensive') {
      return Math.min(baseTokens * 1.3, 2000);
    }
    if (density === 'concise') {
      return Math.min(baseTokens * 0.7, 800);
    }
    
    return baseTokens;
  }

  private chunkContent(content: string): string[] {
    // Split content into meaningful chunks for streaming
    const sentences = content.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 100) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private parseExamples(content: string, count: number): string[] {
    // Simple parsing - in production, this would be more sophisticated
    const examples = content.split(/Example \d+:|Example:|^\d+\./gm)
      .filter(ex => ex.trim().length > 20)
      .slice(0, count)
      .map(ex => ex.trim());

    return examples.length > 0 ? examples : [content.trim()];
  }

  private async evaluateQualityMetrics(
    original: string,
    personalized: string,
    persona: UserPersona
  ): Promise<{
    naturalIntegration: number;
    educationalIntegrity: number;
    relevanceEngagement: number;
    flowReadability: number;
  }> {
    // This could be AI-powered evaluation in the future
    const validation = deepPersonalizationEngine.validatePersonalization(personalized, persona);
    
    return {
      naturalIntegration: Math.min(validation.score / 100 * 25, 25),
      educationalIntegrity: 23, // Assume high integrity for now
      relevanceEngagement: 22, // Assume good relevance
      flowReadability: 21, // Assume good flow
    };
  }

  private getDefaultQualityMetrics() {
    return {
      naturalIntegration: 20,
      educationalIntegrity: 23,
      relevanceEngagement: 22,
      flowReadability: 21,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const deepContentGenerationService = new DeepContentGenerationService(
  // This would be injected in real implementation
  {} as Redis
);