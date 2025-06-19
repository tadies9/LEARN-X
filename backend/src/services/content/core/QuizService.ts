import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import {
  PersonalizedContent,
  FlashcardParams,
  FlashcardResult,
  QuizParams,
  QuizResult,
} from './types';
import crypto from 'crypto';

/**
 * Quiz Service
 * Handles quiz and flashcard generation
 */
export class QuizService {
  constructor(
    private cache: EnhancedAICache,
    private costTracker: CostTracker
  ) {}

  /**
   * Generate adaptive quiz based on persona and content
   */
  async generateAdaptiveQuiz(
    content: string,
    persona: UserPersona,
    questionType:
      | 'multiple_choice'
      | 'scenario_analysis'
      | 'problem_solving'
      | 'application' = 'application'
  ): Promise<PersonalizedContent> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const contentHash = crypto.createHash('sha256')
        .update(content + questionType)
        .digest('hex')
        .substring(0, 16);

      const cached = await this.cache.get({
        service: 'quiz',
        userId: persona.userId,
        contentHash,
        persona,
        context: {
          difficulty: 'adaptive',
          format: questionType
        }
      });

      if (cached) {
        return {
          content: cached.content,
          personalizationScore: cached.metadata?.personalizationScore || 0.8,
          qualityMetrics: {
            naturalIntegration: 0.7,
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

      let prompt = `Create a ${questionType} quiz based on:\n\n${content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Make questions relevant to their interests when possible.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1200,
      });

      const quiz = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(quiz, persona);
      
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      };

      // Track cost
      await this.costTracker.trackRequest({
        userId: persona.userId,
        requestType: 'QUIZ' as any,
        model: 'gpt-4o',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache result
      await this.cache.set(
        {
          service: 'quiz',
          userId: persona.userId,
          contentHash,
          persona,
          context: {
            difficulty: 'adaptive',
            format: questionType
          }
        },
        quiz,
        usage,
        {
          questionType,
          personalizationScore: validation.score,
          contentLength: content.length
        }
      );

      return {
        content: quiz,
        personalizationScore: validation.score,
        qualityMetrics: {
          naturalIntegration: 0.7,
          educationalIntegrity: 0.9,
          relevanceEngagement: 0.8,
          flowReadability: 0.8,
        },
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate adaptive quiz:', error);
      throw error;
    }
  }

  /**
   * Generate deep flashcards with personalized examples
   */
  async generateDeepFlashcards(params: FlashcardParams): Promise<FlashcardResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const contentHash = crypto.createHash('sha256')
        .update(params.content + (params.contextualExamples ? 'contextual' : 'basic'))
        .digest('hex')
        .substring(0, 16);

      const cached = await this.cache.get({
        service: 'flashcard',
        userId: params.persona.userId,
        contentHash,
        persona: params.persona,
        context: {
          difficulty: 'adaptive',
          format: params.contextualExamples ? 'contextual' : 'basic'
        }
      });

      if (cached) {
        const flashcards = JSON.parse(cached.content);
        return { flashcards };
      }

      const interests = [
        ...(params.persona.primaryInterests || []),
        ...(params.persona.secondaryInterests || []),
      ];

      let prompt = `Create flashcards from:\n\n${params.content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        if (params.contextualExamples) {
          prompt += `Include examples from their interests when relevant.\n\n`;
        }
      }
      prompt += `Format as: FRONT: question | BACK: answer | DIFFICULTY: easy/medium/hard`;

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content || '';
      const flashcards = this.parseFlashcards(content);
      
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      };

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: 'FLASHCARD' as any,
        model: params.model || 'gpt-4o',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache result
      await this.cache.set(
        {
          service: 'flashcard',
          userId: params.persona.userId,
          contentHash,
          persona: params.persona,
          context: {
            difficulty: 'adaptive',
            format: params.contextualExamples ? 'contextual' : 'basic'
          }
        },
        JSON.stringify(flashcards),
        usage,
        {
          count: flashcards.length,
          contextualExamples: params.contextualExamples || false
        }
      );

      return { flashcards };
    } catch (error) {
      logger.error('Failed to generate deep flashcards:', error);
      throw error;
    }
  }

  /**
   * Generate deep quiz with adaptive difficulty
   */
  async generateDeepQuiz(params: QuizParams): Promise<QuizResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const contentHash = crypto.createHash('sha256')
        .update(params.content + params.type)
        .digest('hex')
        .substring(0, 16);

      const cached = await this.cache.get({
        service: 'quiz',
        userId: params.persona.userId,
        contentHash,
        persona: params.persona,
        context: {
          difficulty: 'deep',
          format: params.type
        }
      });

      if (cached) {
        const questions = JSON.parse(cached.content);
        return { questions };
      }

      const interests = [
        ...(params.persona.primaryInterests || []),
        ...(params.persona.secondaryInterests || []),
      ];

      let prompt = `Create ${params.type} questions from:\n\n${params.content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Make questions relevant to their interests when possible.\n\n`;
      }
      prompt += `Format each question with clear answer and explanation.`;

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content || '';
      const questions = this.parseQuizQuestions(content, params.type);
      
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      };

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: 'QUIZ' as any,
        model: params.model || 'gpt-4o',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache result
      await this.cache.set(
        {
          service: 'quiz',
          userId: params.persona.userId,
          contentHash,
          persona: params.persona,
          context: {
            difficulty: 'deep',
            format: params.type
          }
        },
        JSON.stringify(questions),
        usage,
        {
          type: params.type,
          count: questions.length
        }
      );

      return { questions };
    } catch (error) {
      logger.error('Failed to generate deep quiz:', error);
      throw error;
    }
  }

  /**
   * Parse flashcards from AI response
   */
  private parseFlashcards(content: string): Array<{
    front: string;
    back: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }> {
    // Basic parsing - will be enhanced
    const lines = content.split('\n').filter((line) => line.includes('FRONT:'));
    return lines.slice(0, 10).map((_line, index) => ({
      front: `Question ${index + 1}`,
      back: `Answer ${index + 1}`,
      difficulty: 'medium' as const,
    }));
  }

  /**
   * Parse quiz questions from AI response
   */
  private parseQuizQuestions(
    content: string,
    type: string
  ): Array<{
    question: string;
    type: string;
    options?: string[];
    answer: string;
    explanation: string;
  }> {
    // Basic parsing - will be enhanced
    const questions = content.split('\n\n').filter((q) => q.trim().length > 20);
    return questions.slice(0, 5).map((_q, index) => ({
      question: `Question ${index + 1}`,
      type,
      answer: 'Sample answer',
      explanation: 'Sample explanation',
    }));
  }
}
