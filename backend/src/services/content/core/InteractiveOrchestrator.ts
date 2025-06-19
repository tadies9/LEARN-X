import { EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { UserPersona } from '../../../types/persona';
import {
  PersonalizedContent,
  FlashcardParams,
  FlashcardResult,
  QuizParams,
  QuizResult,
} from './types';

// Import focused services
import { QuizService } from './QuizService';
import { PracticeService } from './PracticeService';

/**
 * Interactive Orchestrator
 * Coordinates quizzes, flashcards, practice exercises, and visual learning aids
 */
export class InteractiveOrchestrator {
  private quizService: QuizService;
  private practiceService: PracticeService;

  constructor(
    private cache: EnhancedAICache,
    private costTracker: CostTracker
  ) {
    this.quizService = new QuizService(cache, costTracker);
    this.practiceService = new PracticeService(cache, costTracker);
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate personalized practice exercises
   */
  async generatePersonalizedPractice(
    concept: string,
    persona: UserPersona,
    practiceType: 'guided' | 'independent' | 'challenge' = 'independent'
  ): Promise<PersonalizedContent> {
    return this.practiceService.generatePersonalizedPractice(concept, persona, practiceType);
  }

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
    return this.quizService.generateAdaptiveQuiz(content, persona, questionType);
  }

  /**
   * Generate visual learning aid
   */
  async generateVisualLearningAid(
    concept: string,
    persona: UserPersona,
    aidType: 'flowchart' | 'hierarchy' | 'cycle' | 'matrix' | 'timeline' = 'flowchart'
  ): Promise<PersonalizedContent> {
    return this.practiceService.generateVisualLearningAid(concept, persona, aidType);
  }

  /**
   * Generate deep flashcards with personalized examples
   */
  async generateDeepFlashcards(params: FlashcardParams): Promise<FlashcardResult> {
    return this.quizService.generateDeepFlashcards(params);
  }

  /**
   * Generate deep quiz with adaptive difficulty
   */
  async generateDeepQuiz(params: QuizParams): Promise<QuizResult> {
    return this.quizService.generateDeepQuiz(params);
  }
}
