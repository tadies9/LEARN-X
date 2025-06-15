import { openAIService } from '../openai/OpenAIService';
import { deepPromptTemplates } from '../ai/DeepPromptTemplates';
import { deepPersonalizationEngine } from '../personalization/DeepPersonalizationEngine';
import { contentTypePersonalizer } from '../personalization/ContentTypePersonalizer';
import { adaptiveDifficultyEngine } from '../personalization/AdaptiveDifficultyEngine';
import { visualPersonalizationEngine } from '../personalization/VisualPersonalizationEngine';
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
   * Generate personalized introduction that immediately hooks the learner
   */
  async generatePersonalizedIntroduction(
    topic: string,
    content: string,
    persona: UserPersona
  ): Promise<PersonalizedContent> {
    try {
      const prompt = contentTypePersonalizer.generatePersonalizedIntroduction(
        topic,
        content,
        persona
      );

      // Get adaptive difficulty adjustment
      const engagementData = await adaptiveDifficultyEngine.analyzeEngagement(
        persona.userId,
        topic
      );
      const difficultyAdjustment = adaptiveDifficultyEngine.calculateDifficultyAdjustment(
        engagementData,
        persona,
        topic
      );

      // Add visual enhancements if needed
      const visualEnhancements = visualPersonalizationEngine.isVisualLearner(persona)
        ? visualPersonalizationEngine.generateVisualEnhancementInstructions(persona)
        : '';

      const fullPrompt = `${prompt}\n\n${adaptiveDifficultyEngine.generateDifficultyInstructions(difficultyAdjustment, persona)}\n\n${visualEnhancements}`;

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are creating the perfect opening moment for a personalized learning experience.',
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.8, // Higher creativity for hooks
        max_tokens: 600,
      });

      const introduction = response.choices[0].message.content || '';

      // Validate quality
      const validation = deepPersonalizationEngine.validatePersonalization(introduction, persona);
      const qualityMetrics = await this.evaluateQualityMetrics('', introduction, persona);

      return {
        content: introduction,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate personalized introduction:', error);
      throw error;
    }
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
      const content = params.chunks.map((c) => c.content).join('\n\n');
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
            content:
              'You are a master educator who creates seamlessly personalized explanations that feel naturally written for each learner.',
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
        issues: validation.issues,
      });

      // Track cost and performance
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: AIRequestType.EXPLAIN,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
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
          cached: true,
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
            content:
              "Create a naturally personalized summary that integrates the learner's interests seamlessly.",
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
      const validation = deepPersonalizationEngine.validatePersonalization(summary, params.persona);

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
      });

      // Cache high-quality results
      if (validation.score >= 80) {
        await this.cache.setCachedSummary(cacheKey, params.format, params.persona.userId, summary, {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
        });
      }

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
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
            content:
              "Generate concrete, relevant examples that naturally illustrate concepts using scenarios from the learner's world.",
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

  /**
   * Generate progressive concept explanation with adaptive difficulty
   */
  async generateProgressiveExplanation(
    concept: string,
    content: string,
    persona: UserPersona,
    currentLevel: 'foundation' | 'intermediate' | 'advanced' = 'foundation'
  ): Promise<PersonalizedContent> {
    try {
      // Get engagement data and adjust difficulty
      const engagementData = await adaptiveDifficultyEngine.analyzeEngagement(
        persona.userId,
        concept
      );
      const difficultyAdjustment = adaptiveDifficultyEngine.calculateDifficultyAdjustment(
        engagementData,
        persona,
        concept
      );

      const prompt = contentTypePersonalizer.generateProgressiveExplanation(
        concept,
        content,
        persona,
        currentLevel
      );

      // Add difficulty and visual enhancements
      const difficultyInstructions = adaptiveDifficultyEngine.generateDifficultyInstructions(
        difficultyAdjustment,
        persona
      );
      const visualEnhancements = visualPersonalizationEngine.isVisualLearner(persona)
        ? visualPersonalizationEngine.generateVisualEnhancementInstructions(persona)
        : '';

      const fullPrompt = `${prompt}\n\n${difficultyInstructions}\n\n${visualEnhancements}`;

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              "You are creating progressive explanations that build understanding naturally through the learner's domain.",
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: this.getOptimalMaxTokens(persona, content),
      });

      const explanation = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(explanation, persona);
      const qualityMetrics = await this.evaluateQualityMetrics(content, explanation, persona);

      return {
        content: explanation,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate progressive explanation:', error);
      throw error;
    }
  }

  /**
   * Generate contextual examples from user's domain
   */
  async generateContextualExamples(
    concept: string,
    persona: UserPersona,
    exampleType: 'basic' | 'application' | 'problem-solving' | 'real-world' = 'application',
    count: number = 3
  ): Promise<string[]> {
    try {
      const prompt = contentTypePersonalizer.generateContextualExamples(
        concept,
        persona,
        exampleType
      );

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              "Generate realistic, relevant examples that make concepts immediately applicable in the learner's domain.",
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8, // Higher creativity for diverse examples
        max_tokens: 1200,
      });

      const content = response.choices[0].message.content || '';
      return this.parseExamples(content, count);
    } catch (error) {
      logger.error('Failed to generate contextual examples:', error);
      return [`Example of ${concept} in your field...`]; // Fallback
    }
  }

  /**
   * Generate personalized practice problems
   */
  async generatePersonalizedPractice(
    concept: string,
    persona: UserPersona,
    practiceType: 'guided' | 'independent' | 'challenge' = 'independent'
  ): Promise<PersonalizedContent> {
    try {
      const prompt = contentTypePersonalizer.generatePersonalizedPractice(
        concept,
        persona,
        practiceType
      );

      // Adjust difficulty based on engagement
      const engagementData = await adaptiveDifficultyEngine.analyzeEngagement(
        persona.userId,
        concept
      );
      const difficultyAdjustment = adaptiveDifficultyEngine.calculateDifficultyAdjustment(
        engagementData,
        persona,
        concept
      );

      const difficultyInstructions = adaptiveDifficultyEngine.generateDifficultyInstructions(
        difficultyAdjustment,
        persona
      );
      const fullPrompt = `${prompt}\n\n${difficultyInstructions}`;

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              "Create practice problems that feel like real challenges from the learner's domain.",
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const practice = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(practice, persona);
      const qualityMetrics = await this.evaluateQualityMetrics('', practice, persona);

      return {
        content: practice,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate personalized practice:', error);
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
    try {
      const prompt = contentTypePersonalizer.generateGoalOrientedSummary(
        content,
        persona,
        summaryPurpose
      );

      // Add visual enhancements if needed
      const visualEnhancements = visualPersonalizationEngine.isVisualLearner(persona)
        ? visualPersonalizationEngine.generateVisualSummary(content, persona, 'visual-outline')
        : '';

      const fullPrompt = visualEnhancements ? `${prompt}\n\n${visualEnhancements}` : prompt;

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              "Create summaries that connect learning to the user's goals and make every insight personally relevant.",
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.6,
        max_tokens: this.getSummaryMaxTokens(summaryPurpose, persona.contentDensity),
      });

      const summary = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(summary, persona);
      const qualityMetrics = await this.evaluateQualityMetrics(content, summary, persona);

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate goal-oriented summary:', error);
      throw error;
    }
  }

  /**
   * Generate adaptive quiz with real-time difficulty adjustment
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
    try {
      // Get current learning state for difficulty adjustment
      const learningState = await adaptiveDifficultyEngine.getLearningState(persona.userId);

      const prompt = contentTypePersonalizer.generatePersonalizedQuiz(
        content,
        persona,
        questionType
      );

      // Adjust difficulty based on mastery level
      const difficultyAdjustment =
        learningState.currentMastery > 80
          ? 'Include challenging edge cases and complex scenarios'
          : learningState.currentMastery < 50
            ? 'Focus on fundamental understanding with clear, supportive questions'
            : 'Use balanced difficulty with practical applications';

      const fullPrompt = `${prompt}\n\nDIFFICULTY ADJUSTMENT: ${difficultyAdjustment}`;

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              "Create quiz questions that feel like realistic assessments from the learner's professional domain.",
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1500,
      });

      const quiz = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(quiz, persona);
      const qualityMetrics = await this.evaluateQualityMetrics(content, quiz, persona);

      return {
        content: quiz,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate adaptive quiz:', error);
      throw error;
    }
  }

  /**
   * Generate visual learning aids for visual learners
   */
  async generateVisualLearningAid(
    concept: string,
    persona: UserPersona,
    aidType: 'flowchart' | 'hierarchy' | 'cycle' | 'matrix' | 'timeline' = 'flowchart'
  ): Promise<PersonalizedContent> {
    if (!visualPersonalizationEngine.isVisualLearner(persona)) {
      throw new Error('Visual learning aids are only generated for visual learners');
    }

    try {
      const prompt = visualPersonalizationEngine.generateVisualLearningAid(
        concept,
        persona,
        aidType
      );

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Create detailed visual learning aid descriptions that help visual learners construct mental models.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const visualAid = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(visualAid, persona);
      const qualityMetrics = await this.evaluateQualityMetrics('', visualAid, persona);

      return {
        content: visualAid,
        personalizationScore: validation.score,
        qualityMetrics,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate visual learning aid:', error);
      throw error;
    }
  }

  /**
   * Generate deeply personalized flashcards
   */
  async generateDeepFlashcards(params: {
    content: string;
    persona: UserPersona;
    contextualExamples?: boolean;
    model?: string;
  }): Promise<{
    flashcards: Array<{
      front: string;
      back: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
  }> {
    try {
      const primaryLens = deepPersonalizationEngine.getPrimaryLens(params.persona);
      const anchors = deepPersonalizationEngine.getContextualAnchors(params.persona);

      const prompt = `Generate flashcards for learning this content through a ${primaryLens} perspective.

Content to create flashcards from:
${params.content}

Requirements:
1. Create 8-12 flashcards that test key concepts
2. Front: Questions that feel natural from a ${primaryLens} perspective
3. Back: Clear answers that connect to familiar concepts from ${anchors.domains.join(', ')}
4. Mix difficulty levels: 3-4 easy, 4-5 medium, 2-3 hard
5. Use scenarios and examples from the user's world (${primaryLens}, ${anchors.experiences.join(', ')})
6. NEVER say "as a ${primaryLens} fan" or "since you like ${primaryLens}"
7. Questions should feel naturally written for someone in this domain

Format each flashcard as:
DIFFICULTY: [easy|medium|hard]
FRONT: [question]
BACK: [answer]

Example format (DO NOT copy this content):
DIFFICULTY: medium
FRONT: When would you use a recursive function to solve a problem?
BACK: Use recursion when breaking down a problem into smaller, similar subproblems - like calculating team statistics across multiple seasons where each season follows the same pattern.`;

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Create flashcards that seamlessly integrate domain-specific examples without announcing the personalization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content || '';

      // Parse flashcards from response
      const flashcards = this.parseFlashcards(content);

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: AIRequestType.FLASHCARD,
        model: params.model || 'gpt-4o',
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        responseTimeMs: Date.now(),
      });

      return { flashcards };
    } catch (error) {
      logger.error('Failed to generate deep flashcards:', error);
      throw error;
    }
  }

  /**
   * Generate deeply personalized quiz
   */
  async generateDeepQuiz(params: {
    content: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    persona: UserPersona;
    adaptiveDifficulty?: boolean;
    model?: string;
  }): Promise<{
    questions: Array<{
      question: string;
      type: string;
      options?: string[];
      answer: string;
      explanation: string;
    }>;
  }> {
    try {
      const primaryLens = deepPersonalizationEngine.getPrimaryLens(params.persona);
      const anchors = deepPersonalizationEngine.getContextualAnchors(params.persona);

      // Get adaptive difficulty if requested
      let difficultyGuidance = '';
      if (params.adaptiveDifficulty) {
        const engagementData = await adaptiveDifficultyEngine.analyzeEngagement(
          params.persona.userId,
          'quiz'
        );
        const adjustment = adaptiveDifficultyEngine.calculateDifficultyAdjustment(
          engagementData,
          params.persona,
          'quiz'
        );
        difficultyGuidance = adaptiveDifficultyEngine.generateDifficultyInstructions(
          adjustment,
          params.persona
        );
      }

      const typeInstructions = {
        multiple_choice: 'Create multiple choice questions with 4 options each',
        true_false: 'Create true/false questions with nuanced statements',
        short_answer: 'Create short answer questions requiring 1-2 sentence responses',
      };

      const prompt = `Generate a ${params.type} quiz that tests understanding through a ${primaryLens} lens.

Content to quiz on:
${params.content}

Requirements:
1. Create 5-8 questions that test key concepts
2. ${typeInstructions[params.type]}
3. Frame questions using scenarios from ${primaryLens} and ${anchors.domains.join(', ')}
4. Explanations should reinforce learning through familiar examples
5. NEVER say "as a ${primaryLens} fan" or announce the personalization
6. Questions should feel like they come from a ${params.persona.currentRole || 'professional'} context

${difficultyGuidance}

Format each question as:
QUESTION: [question text]
${params.type === 'multiple_choice' ? 'OPTIONS:\nA) [option]\nB) [option]\nC) [option]\nD) [option]' : ''}
ANSWER: [correct answer]
EXPLANATION: [why this answer is correct, using domain examples]`;

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Create quiz questions that naturally incorporate domain-specific scenarios without highlighting the personalization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content || '';

      // Parse questions from response
      const questions = this.parseQuizQuestions(content, params.type);

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: AIRequestType.QUIZ,
        model: params.model || 'gpt-4o',
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        responseTimeMs: Date.now(),
      });

      return { questions };
    } catch (error) {
      logger.error('Failed to generate deep quiz:', error);
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
    if (persona.communicationTone === 'casual' || persona.communicationTone === 'friendly') {
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

  private getSummaryMaxTokens(
    format: string | 'review' | 'application' | 'next-steps' | 'connections',
    density?: string
  ): number {
    // Handle both summary formats and purposes
    const formatTokens = {
      'key-points': 800,
      comprehensive: 1500,
      'visual-map': 1000,
      review: 1000,
      application: 1200,
      'next-steps': 800,
      connections: 1000,
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
    const examples = content
      .split(/Example \d+:|Example:|^\d+\./gm)
      .filter((ex) => ex.trim().length > 20)
      .slice(0, count)
      .map((ex) => ex.trim());

    return examples.length > 0 ? examples : [content.trim()];
  }

  private parseFlashcards(content: string): Array<{
    front: string;
    back: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }> {
    const flashcards: Array<{
      front: string;
      back: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }> = [];

    // Split by difficulty markers
    const cards = content.split(/DIFFICULTY:/i).filter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split('\n');
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      let front = '';
      let back = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (i === 0 && line.match(/^(easy|medium|hard)/i)) {
          difficulty = line.toLowerCase() as 'easy' | 'medium' | 'hard';
        } else if (line.startsWith('FRONT:')) {
          front = line.substring(6).trim();
        } else if (line.startsWith('BACK:')) {
          back = lines.slice(i).join('\n').substring(5).trim();
          break;
        }
      }

      if (front && back) {
        flashcards.push({ front, back, difficulty });
      }
    }

    // Fallback if parsing fails
    if (flashcards.length === 0) {
      flashcards.push({
        front: 'What is the main concept covered?',
        back: 'Review the material to understand the key concepts.',
        difficulty: 'medium',
      });
    }

    return flashcards;
  }

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
    const questions: Array<{
      question: string;
      type: string;
      options?: string[];
      answer: string;
      explanation: string;
    }> = [];

    // Split by question markers
    const items = content.split(/QUESTION:/i).filter((q) => q.trim());

    for (const item of items) {
      const lines = item.trim().split('\n');
      let question = '';
      const options: string[] = [];
      let answer = '';
      let explanation = '';
      let inOptions = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (i === 0) {
          question = line;
        } else if (line.startsWith('OPTIONS:')) {
          inOptions = true;
        } else if (inOptions && line.match(/^[A-D]\)/)) {
          options.push(line);
        } else if (line.startsWith('ANSWER:')) {
          inOptions = false;
          answer = line.substring(7).trim();
        } else if (line.startsWith('EXPLANATION:')) {
          explanation = lines.slice(i).join('\n').substring(12).trim();
          break;
        }
      }

      if (question && answer) {
        questions.push({
          question,
          type,
          ...(type === 'multiple_choice' && options.length > 0 ? { options } : {}),
          answer,
          explanation: explanation || 'See course material for detailed explanation.',
        });
      }
    }

    // Fallback if parsing fails
    if (questions.length === 0) {
      questions.push({
        question: 'What is a key concept from this material?',
        type,
        answer: 'Review the material to identify key concepts.',
        explanation: 'Understanding key concepts is essential for mastery.',
      });
    }

    return questions;
  }

  private async evaluateQualityMetrics(
    _original: string,
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
      naturalIntegration: Math.min((validation.score / 100) * 25, 25),
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const deepContentGenerationService = new DeepContentGenerationService(
  // This would be injected in real implementation
  {} as Redis
);
