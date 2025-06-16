import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { UserPersona } from '../../../types/persona';
import Redis from 'ioredis';

// Import specialized orchestrators
import { ExplanationOrchestrator } from './ExplanationOrchestrator';
import { SummaryOrchestrator } from './SummaryOrchestrator';
import { InteractiveOrchestrator } from './InteractiveOrchestrator';
import { ChatOrchestrator } from './ChatOrchestrator';

// Re-export types for convenience
export { DeepExplanationParams, DeepSummaryParams, PersonalizedContent } from './types';

/**
 * Content Orchestrator - Main coordination point for personalized content generation
 * Delegates to specialized orchestrators based on content type
 */
export class ContentOrchestrator {
  private cache: AICache;
  private costTracker: CostTracker;
  private explanationOrchestrator: ExplanationOrchestrator;
  private summaryOrchestrator: SummaryOrchestrator;
  private interactiveOrchestrator: InteractiveOrchestrator;
  private chatOrchestrator: ChatOrchestrator;

  constructor(redis: Redis) {
    this.cache = new AICache(redis);
    this.costTracker = new CostTracker();
    
    // Initialize specialized orchestrators
    this.explanationOrchestrator = new ExplanationOrchestrator(this.cache, this.costTracker);
    this.summaryOrchestrator = new SummaryOrchestrator(this.cache, this.costTracker);
    this.interactiveOrchestrator = new InteractiveOrchestrator(this.cache, this.costTracker);
    this.chatOrchestrator = new ChatOrchestrator(this.cache, this.costTracker);
  }

  // Explanation Methods
  async generatePersonalizedIntroduction(
    topic: string,
    content: string,
    persona: UserPersona
  ) {
    return this.explanationOrchestrator.generatePersonalizedIntroduction(topic, content, persona);
  }

  async *generateDeepExplanation(params: any) {
    yield* this.explanationOrchestrator.generateDeepExplanation(params);
  }

  async generateProgressiveExplanation(
    concept: string,
    content: string,
    persona: UserPersona,
    currentLevel: 'foundation' | 'intermediate' | 'advanced' = 'foundation'
  ) {
    return this.explanationOrchestrator.generateProgressiveExplanation(concept, content, persona, currentLevel);
  }

  async generatePersonalizedExamples(
    concept: string,
    persona: UserPersona,
    count: number = 3
  ) {
    return this.explanationOrchestrator.generatePersonalizedExamples(concept, persona, count);
  }

  async generateContextualExamples(
    concept: string,
    persona: UserPersona,
    exampleType: 'basic' | 'application' | 'problem-solving' | 'real-world' = 'application',
    count: number = 3
  ) {
    return this.explanationOrchestrator.generateContextualExamples(concept, persona, exampleType, count);
  }

  // Summary Methods
  async generateDeepSummary(params: any) {
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
    return this.interactiveOrchestrator.generatePersonalizedPractice(concept, persona, practiceType);
  }

  async generateAdaptiveQuiz(
    content: string,
    persona: UserPersona,
    questionType: 'multiple_choice' | 'scenario_analysis' | 'problem_solving' | 'application' = 'application'
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

  async generateDeepFlashcards(params: any) {
    return this.interactiveOrchestrator.generateDeepFlashcards(params);
  }

  async generateDeepQuiz(params: any) {
    return this.interactiveOrchestrator.generateDeepQuiz(params);
  }

  // Chat Methods
  async *streamPersonalizedChat(params: any) {
    yield* this.chatOrchestrator.streamPersonalizedChat(params);
  }
} 