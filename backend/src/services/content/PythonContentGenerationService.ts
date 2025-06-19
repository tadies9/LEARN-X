/**
 * Python Content Generation Service
 * Replaces the original ContentGenerationService with Python backend calls
 * Maintains the same interface for backward compatibility
 */

import { pythonContentClient, PythonContentClient } from '../ai/PythonContentClient';
import { logger } from '../../utils/logger';
import { UserPersona } from '../../types/persona';
import { GenerationParams } from '../../types/ai';
import { QuizType } from '../ai/PromptTemplates';

export interface ExplanationParams extends GenerationParams {
  chunks: Array<{ id: string; content: string }>;
  topic: string;
  persona: UserPersona;
  subtopic?: string;
  currentLevel?: 'foundation' | 'intermediate' | 'advanced';
}

export interface SummaryParams extends GenerationParams {
  content: string;
  format: 'key-points' | 'comprehensive' | 'visual-map';
  persona: UserPersona;
  purpose?: 'review' | 'application' | 'next-steps' | 'connections';
}

export interface FlashcardParams extends GenerationParams {
  content: string;
  count?: number;
  persona?: UserPersona;
  topic?: string;
}

export interface QuizParams extends GenerationParams {
  content: string;
  type: QuizType;
  count?: number;
  persona?: UserPersona;
  topic?: string;
}

export interface ChatParams {
  message: string;
  context: string[];
  currentPage?: number;
  selectedText?: string;
  persona: UserPersona | null;
  model?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export class PythonContentGenerationService {
  private pythonClient: PythonContentClient;

  constructor() {
    this.pythonClient = pythonContentClient;
    
    // Set up event listeners for monitoring
    this.pythonClient.on('usage', (data) => {
      logger.info('Python service usage:', data);
    });
    
    this.pythonClient.on('error', (error) => {
      logger.error('Python service error:', error);
    });
  }

  /**
   * Generate streaming explanation (maintains original interface)
   */
  async *generateExplanation(params: ExplanationParams): AsyncGenerator<string> {
    try {
      logger.info(`Generating explanation for topic: ${params.topic}`);
      
      // Transform parameters to Python service format
      const pythonParams = {
        user_id: params.persona.userId,
        chunks: params.chunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          metadata: {},
          score: 1.0
        })),
        topic: params.topic,
        subtopic: params.subtopic,
        current_level: params.currentLevel || 'foundation',
        model: params.model,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens,
        use_cache: true,
        personalization_level: 'high' as const,
        include_examples: true,
        include_practice: false,
        stream: true
      };

      // Stream from Python service
      yield* this.pythonClient.generateExplanationStream(pythonParams);
      
    } catch (error) {
      logger.error('Failed to generate explanation via Python service:', error);
      
      // Fallback to error message
      yield 'I apologize, but I encountered an error while generating the explanation. Please try again.';
    }
  }

  /**
   * Generate summary (maintains original interface)
   */
  async generateSummary(params: SummaryParams): Promise<string> {
    try {
      logger.info(`Generating summary with format: ${params.format}`);
      
      // Transform parameters
      const pythonParams = {
        user_id: params.persona.userId,
        content: params.content,
        format: params.format,
        purpose: params.purpose || 'review',
        model: params.model,
        temperature: params.temperature || 0.5,
        max_tokens: params.maxTokens || 1000,
        use_cache: true,
        personalization_level: 'high' as const
      };

      const result = await this.pythonClient.generateSummary(pythonParams);
      return result.content;
      
    } catch (error) {
      logger.error('Failed to generate summary via Python service:', error);
      throw new Error('Failed to generate summary. Please try again.');
    }
  }

  /**
   * Generate flashcards (maintains original interface)
   */
  async generateFlashcards(params: FlashcardParams): Promise<Array<{
    front: string;
    back: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>> {
    try {
      logger.info(`Generating ${params.count || 10} flashcards`);
      
      // Transform parameters
      const pythonParams = {
        user_id: params.persona?.userId || 'anonymous',
        content: params.content,
        topic: params.topic || 'General',
        count: params.count || 10,
        model: params.model,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 1500,
        use_cache: true,
        personalization_level: 'medium' as const,
        contextual_examples: true,
        difficulty_mix: true
      };

      return await this.pythonClient.generateFlashcards(pythonParams);
      
    } catch (error) {
      logger.error('Failed to generate flashcards via Python service:', error);
      throw new Error('Failed to generate flashcards. Please try again.');
    }
  }

  /**
   * Generate quiz (maintains original interface)
   */
  async generateQuiz(params: QuizParams): Promise<Array<{
    question: string;
    type: QuizType;
    options?: string[];
    answer: string;
    explanation: string;
  }>> {
    try {
      logger.info(`Generating ${params.count || 5} quiz questions of type: ${params.type}`);
      
      // Map QuizType to Python service format
      const quizTypeMap = {
        [QuizType.MULTIPLE_CHOICE]: 'multiple_choice' as const,
        [QuizType.TRUE_FALSE]: 'true_false' as const,
        [QuizType.SHORT_ANSWER]: 'short_answer' as const
      };

      // Transform parameters
      const pythonParams = {
        user_id: params.persona?.userId || 'anonymous',
        content: params.content,
        topic: params.topic || 'General',
        quiz_type: quizTypeMap[params.type] || 'multiple_choice',
        count: params.count || 5,
        model: params.model,
        temperature: params.temperature || 0.6,
        max_tokens: params.maxTokens || 2000,
        use_cache: true,
        personalization_level: 'medium' as const,
        adaptive_difficulty: true,
        include_explanations: true
      };

      const questions = await this.pythonClient.generateQuiz(pythonParams);
      
      // Transform back to original format
      return questions.map(q => ({
        question: q.question,
        type: params.type,
        options: q.type === 'multiple_choice' ? Object.values(q.options || {}) : undefined,
        answer: q.answer,
        explanation: q.explanation
      }));
      
    } catch (error) {
      logger.error('Failed to generate quiz via Python service:', error);
      throw new Error('Failed to generate quiz. Please try again.');
    }
  }

  /**
   * Stream chat response (maintains original interface)
   */
  async *streamChatResponse(params: ChatParams): AsyncGenerator<string> {
    try {
      logger.info('Streaming chat response');
      
      // Transform parameters
      const pythonParams = {
        user_id: params.persona?.userId || 'anonymous',
        message: params.message,
        context: params.context,
        current_page: params.currentPage,
        selected_text: params.selectedText,
        conversation_history: params.conversationHistory || [],
        model: params.model,
        temperature: 0.7,
        max_tokens: 1000,
        use_cache: false,
        personalization_level: 'high' as const,
        stream: true
      };

      yield* this.pythonClient.streamChatResponse(pythonParams);
      
    } catch (error) {
      logger.error('Failed to stream chat response via Python service:', error);
      yield 'I apologize, but I encountered an error. Please try rephrasing your question.';
    }
  }

  /**
   * Generate personalized introduction
   */
  async generatePersonalizedIntroduction(
    topic: string,
    content: string,
    persona: UserPersona
  ): Promise<string> {
    try {
      logger.info(`Generating personalized introduction for topic: ${topic}`);
      
      const result = await this.pythonClient.generateIntroduction(
        topic,
        content,
        persona.userId
      );
      
      return result.content;
      
    } catch (error) {
      logger.error('Failed to generate personalized introduction:', error);
      throw new Error('Failed to generate introduction. Please try again.');
    }
  }

  /**
   * Generate personalized examples
   */
  async generatePersonalizedExamples(
    concept: string,
    persona: UserPersona,
    count: number = 3
  ): Promise<string[]> {
    try {
      logger.info(`Generating ${count} personalized examples for concept: ${concept}`);
      
      return await this.pythonClient.generateExamples(
        concept,
        persona.userId,
        count
      );
      
    } catch (error) {
      logger.error('Failed to generate personalized examples:', error);
      throw new Error('Failed to generate examples. Please try again.');
    }
  }

  /**
   * Update user persona
   */
  async updateUserPersona(userId: string, updates: Record<string, any>): Promise<void> {
    try {
      logger.info(`Updating persona for user: ${userId}`);
      
      await this.pythonClient.updatePersona(userId, updates);
      
    } catch (error) {
      logger.error('Failed to update user persona:', error);
      throw new Error('Failed to update persona. Please try again.');
    }
  }

  /**
   * Get personalization score for content
   */
  async getPersonalizationScore(
    userId: string,
    content: string,
    contentType: string
  ): Promise<Record<string, number>> {
    try {
      return await this.pythonClient.getPersonalizationScore(userId, content, contentType);
    } catch (error) {
      logger.error('Failed to get personalization score:', error);
      return { overall: 0.0 };
    }
  }

  /**
   * Health check for Python service
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      return await this.pythonClient.healthCheck();
    } catch (error) {
      logger.error('Python service health check failed:', error);
      throw new Error('Python service is not available');
    }
  }

  /**
   * Get service metrics
   */
  async getServiceMetrics(): Promise<Record<string, any>> {
    try {
      return await this.pythonClient.getMetrics();
    } catch (error) {
      logger.error('Failed to get service metrics:', error);
      return {};
    }
  }

  /**
   * Test Python service connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Python service connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await this.pythonClient.shutdown();
      logger.info('Python content generation service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Export singleton instance
export const pythonContentGenerationService = new PythonContentGenerationService();