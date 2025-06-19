import { getEnhancedAICache, EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { UserPersona } from '../../../types/persona';
import { redisClient } from '../../../config/redis';
import {
  DeepExplanationParams,
  DeepSummaryParams,
  ChatParams,
  FlashcardParams,
  QuizParams,
} from './types';

// Import specialized orchestrators
import { ExplanationOrchestrator } from './ExplanationOrchestrator';
import { SummaryOrchestrator } from './SummaryOrchestrator';
import { InteractiveOrchestrator } from './InteractiveOrchestrator';
import { ChatOrchestrator } from './ChatOrchestrator';

// Re-export types for convenience
export {
  DeepExplanationParams,
  DeepSummaryParams,
  PersonalizedContent,
  ChatParams,
  FlashcardParams,
  QuizParams,
  FlashcardResult,
  QuizResult,
} from './types';

/**
 * Content Orchestrator - Main coordination point for personalized content generation
 * Delegates to specialized orchestrators based on content type
 */
export class ContentOrchestrator {
  private cache: EnhancedAICache;
  private costTracker: CostTracker;
  private explanationOrchestrator: ExplanationOrchestrator;
  private summaryOrchestrator: SummaryOrchestrator;
  private interactiveOrchestrator: InteractiveOrchestrator;
  private chatOrchestrator: ChatOrchestrator;

  constructor() {
    this.costTracker = new CostTracker();
    this.cache = getEnhancedAICache(redisClient, this.costTracker);

    // Initialize specialized orchestrators
    this.explanationOrchestrator = new ExplanationOrchestrator(this.cache, this.costTracker);
    this.summaryOrchestrator = new SummaryOrchestrator(this.cache, this.costTracker);
    this.interactiveOrchestrator = new InteractiveOrchestrator(this.cache, this.costTracker);
    this.chatOrchestrator = new ChatOrchestrator(this.cache, this.costTracker);
  }

  // Explanation Methods
  async generatePersonalizedIntroduction(topic: string, content: string, persona: UserPersona) {
    return this.explanationOrchestrator.generatePersonalizedIntroduction(topic, content, persona);
  }

  async *generateDeepExplanation(params: DeepExplanationParams) {
    yield* this.explanationOrchestrator.generateDeepExplanation(params);
  }

  async generateProgressiveExplanation(
    concept: string,
    content: string,
    persona: UserPersona,
    currentLevel: 'foundation' | 'intermediate' | 'advanced' = 'foundation'
  ) {
    return this.explanationOrchestrator.generateProgressiveExplanation(
      concept,
      content,
      persona,
      currentLevel
    );
  }

  async generatePersonalizedExamples(concept: string, persona: UserPersona, count: number = 3) {
    return this.explanationOrchestrator.generatePersonalizedExamples(concept, persona, count);
  }

  async generateContextualExamples(
    concept: string,
    persona: UserPersona,
    exampleType: 'basic' | 'application' | 'problem-solving' | 'real-world' = 'application',
    count: number = 3
  ) {
    return this.explanationOrchestrator.generateContextualExamples(
      concept,
      persona,
      exampleType,
      count
    );
  }

  // Summary Methods
  async generateDeepSummary(params: DeepSummaryParams) {
    return this.summaryOrchestrator.generateDeepSummary(params);
  }

  async generateGoalOrientedSummary(
    content: string,
    persona: UserPersona,
    summaryPurpose: 'review' | 'application' | 'next-steps' | 'connections' = 'review'
  ) {
    return this.summaryOrchestrator.generateGoalOrientedSummary(content, persona, summaryPurpose);
  }

  // Interactive Methods
  async generatePersonalizedPractice(
    concept: string,
    persona: UserPersona,
    practiceType: 'guided' | 'independent' | 'challenge' = 'independent'
  ) {
    return this.interactiveOrchestrator.generatePersonalizedPractice(
      concept,
      persona,
      practiceType
    );
  }

  async generateAdaptiveQuiz(
    content: string,
    persona: UserPersona,
    questionType:
      | 'multiple_choice'
      | 'scenario_analysis'
      | 'problem_solving'
      | 'application' = 'application'
  ) {
    return this.interactiveOrchestrator.generateAdaptiveQuiz(content, persona, questionType);
  }

  async generateVisualLearningAid(
    concept: string,
    persona: UserPersona,
    aidType: 'flowchart' | 'hierarchy' | 'cycle' | 'matrix' | 'timeline' = 'flowchart'
  ) {
    return this.interactiveOrchestrator.generateVisualLearningAid(concept, persona, aidType);
  }

  async generateDeepFlashcards(params: FlashcardParams) {
    return this.interactiveOrchestrator.generateDeepFlashcards(params);
  }

  async generateDeepQuiz(params: QuizParams) {
    return this.interactiveOrchestrator.generateDeepQuiz(params);
  }

  // Chat Methods
  async *streamPersonalizedChat(params: ChatParams) {
    yield* this.chatOrchestrator.streamPersonalizedChat(params);
  }
}
