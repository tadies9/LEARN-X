import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { UserPersona } from '../../../types/persona';
import { DeepExplanationParams, PersonalizedContent } from './types';

// Import focused services
import { IntroductionService } from './IntroductionService';
import { ExampleService } from './ExampleService';
import { StreamingExplanationService } from './StreamingExplanationService';

/**
 * Explanation Orchestrator
 * Coordinates personalized explanations, introductions, and examples
 */
export class ExplanationOrchestrator {
  private introductionService: IntroductionService;
  private exampleService: ExampleService;
  private streamingExplanationService: StreamingExplanationService;

  constructor(
    private cache: AICache,
    private costTracker: CostTracker
  ) {
    this.introductionService = new IntroductionService(cache, costTracker);
    this.exampleService = new ExampleService(cache, costTracker);
    this.streamingExplanationService = new StreamingExplanationService(cache, costTracker);
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate personalized introduction that immediately hooks the learner
   */
  async generatePersonalizedIntroduction(
    topic: string,
    content: string,
    persona: UserPersona
  ): Promise<PersonalizedContent> {
    return this.introductionService.generatePersonalizedIntroduction(topic, content, persona);
  }

  /**
   * Generate deeply personalized explanation with streaming
   */
  async *generateDeepExplanation(params: DeepExplanationParams): AsyncGenerator<string> {
    yield* this.streamingExplanationService.generateDeepExplanation(params);
  }

  /**
   * Generate progressive explanation that builds complexity
   */
  async generateProgressiveExplanation(
    concept: string,
    content: string,
    persona: UserPersona,
    currentLevel: 'foundation' | 'intermediate' | 'advanced' = 'foundation'
  ): Promise<PersonalizedContent> {
    return this.streamingExplanationService.generateProgressiveExplanation(
      concept,
      content,
      persona,
      currentLevel
    );
  }

  /**
   * Generate personalized examples for concepts
   */
  async generatePersonalizedExamples(
    concept: string,
    persona: UserPersona,
    count: number = 3
  ): Promise<string[]> {
    return this.exampleService.generatePersonalizedExamples(concept, persona, count);
  }

  /**
   * Generate contextual examples for different use cases
   */
  async generateContextualExamples(
    concept: string,
    persona: UserPersona,
    exampleType: 'basic' | 'application' | 'problem-solving' | 'real-world' = 'application',
    count: number = 3
  ): Promise<string[]> {
    return this.exampleService.generateContextualExamples(concept, persona, exampleType, count);
  }
}
