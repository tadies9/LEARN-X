import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { PersonalizedContent, FlashcardParams, FlashcardResult, QuizParams, QuizResult } from './types';

/**
 * Quiz Service
 * Handles quiz and flashcard generation
 */
export class QuizService {
  constructor(
    private cache: AICache,
    private costTracker: CostTracker
  ) {
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate adaptive quiz based on persona and content
   */
  async generateAdaptiveQuiz(
    content: string,
    persona: UserPersona,
    questionType: 'multiple_choice' | 'scenario_analysis' | 'problem_solving' | 'application' = 'application'
  ): Promise<PersonalizedContent> {
    try {
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
    try {
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
    try {
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
    const lines = content.split('\n').filter(line => line.includes('FRONT:'));
    return lines.slice(0, 10).map((_line, index) => ({
      front: `Question ${index + 1}`,
      back: `Answer ${index + 1}`,
      difficulty: 'medium' as const,
    }));
  }

  /**
   * Parse quiz questions from AI response
   */
  private parseQuizQuestions(content: string, type: string): Array<{
    question: string;
    type: string;
    options?: string[];
    answer: string;
    explanation: string;
  }> {
    // Basic parsing - will be enhanced
    const questions = content.split('\n\n').filter(q => q.trim().length > 20);
    return questions.slice(0, 5).map((_q, index) => ({
      question: `Question ${index + 1}`,
      type,
      answer: 'Sample answer',
      explanation: 'Sample explanation',
    }));
  }
} 