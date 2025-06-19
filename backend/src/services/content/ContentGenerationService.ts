import { openAIService } from '../openai/OpenAIService';
import { promptTemplates, QuizType } from '../ai/PromptTemplates';
import { getEnhancedAICache, EnhancedAICache } from '../cache/EnhancedAICache';
import { CostTracker } from '../ai/CostTracker';
import { TokenCounter } from '../ai/TokenCounter';
import { logger } from '../../utils/logger';
import { AIRequestType, GenerationParams } from '../../types/ai';
import { UserPersona } from '../../types/persona';
import { redisClient } from '../../config/redis';
import crypto from 'crypto';

export interface ExplanationParams extends GenerationParams {
  chunks: Array<{ id: string; content: string }>;
  topic: string;
  persona: UserPersona;
}

export interface SummaryParams extends GenerationParams {
  content: string;
  format: 'key-points' | 'comprehensive' | 'visual-map';
  persona: UserPersona;
}

export interface FlashcardParams extends GenerationParams {
  content: string;
  count?: number;
  userId?: string;
}

export interface QuizParams extends GenerationParams {
  content: string;
  type: QuizType;
  count?: number;
  userId?: string;
}

export class ContentGenerationService {
  private cache: EnhancedAICache;
  private costTracker: CostTracker;

  constructor() {
    this.costTracker = new CostTracker();
    this.cache = getEnhancedAICache(redisClient, this.costTracker);
  }

  async *generateExplanation(params: ExplanationParams): AsyncGenerator<string> {
    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Build personalized prompt
      const content = params.chunks.map((c) => c.content).join('\n\n');
      const prompt = promptTemplates.buildExplainPrompt(params.persona, content);
      promptTokens = TokenCounter.countTokens(prompt, params.model);

      // Create streaming completion
      const stream = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating personalized explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
      });

      let fullContent = '';

      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield content;
        }
      }

      // Calculate completion tokens
      completionTokens = TokenCounter.countTokens(fullContent, params.model);

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: 'explain' as AIRequestType,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache the result with personalization
      const contentHash = crypto.createHash('sha256')
        .update(params.chunks.map(c => c.content).join('\n'))
        .digest('hex')
        .substring(0, 16);

      await this.cache.set(
        {
          service: 'explain',
          userId: params.persona.userId,
          contentHash,
          persona: params.persona,
          context: {
            moduleId: params.chunks[0]?.id,
            difficulty: 'intermediate',
            format: 'explanation'
          }
        },
        fullContent,
        { promptTokens, completionTokens },
        {
          topic: params.topic,
          chunkCount: params.chunks.length
        }
      );
    } catch (error) {
      logger.error('Failed to generate explanation:', error);
      throw error;
    }
  }

  async generateSummary(params: SummaryParams): Promise<string> {
    const startTime = Date.now();

    try {
      // Check cache first with enhanced personalization
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
          difficulty: 'basic'
        }
      });

      if (cached) {
        return cached.content;
      }

      // Build prompt
      const prompt = promptTemplates.buildSummarizePrompt(params.persona, params.content);
      const promptTokens = TokenCounter.countTokens(prompt, params.model);

      // Generate summary
      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Create a ${params.format} summary based on user preferences.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: params.temperature || 0.5,
        max_tokens: params.maxTokens || 1000,
      });

      const summary = response.choices[0].message.content || '';
      const completionTokens = response.usage?.completion_tokens || 0;

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona.userId,
        requestType: 'summary' as AIRequestType,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache result with enhanced personalization
      await this.cache.set(
        {
          service: 'summary',
          userId: params.persona.userId,
          contentHash,
          persona: params.persona,
          context: {
            format: params.format,
            difficulty: 'basic'
          }
        },
        summary,
        { promptTokens, completionTokens },
        {
          format: params.format,
          contentLength: params.content.length
        }
      );

      return summary;
    } catch (error) {
      logger.error('Failed to generate summary:', error);
      throw error;
    }
  }

  async generateFlashcards(params: FlashcardParams): Promise<
    Array<{
      front: string;
      back: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }>
  > {
    const startTime = Date.now();

    try {
      const prompt = promptTemplates.buildFlashcardPrompt(params.content);
      const promptTokens = TokenCounter.countTokens(prompt, params.model);

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Create educational flashcards in the specified format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: params.temperature || 0.6,
        max_tokens: params.maxTokens || 1500,
      });

      const content = response.choices[0].message.content || '';
      const completionTokens = response.usage?.completion_tokens || 0;

      // Parse flashcards from response
      const flashcards = this.parseFlashcards(content);

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.userId || 'system',
        requestType: 'flashcard' as AIRequestType,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache flashcards for future use
      if (params.userId) {
        const contentHash = crypto.createHash('sha256')
          .update(params.content)
          .digest('hex')
          .substring(0, 16);

        await this.cache.set(
          {
            service: 'flashcard',
            userId: params.userId,
            contentHash,
            context: {
              difficulty: 'intermediate',
              format: `count_${params.count || 5}`
            }
          },
          JSON.stringify(flashcards),
          { promptTokens, completionTokens },
          {
            count: flashcards.length,
            avgDifficulty: this.calculateAvgDifficulty(flashcards)
          }
        );
      }

      return flashcards;
    } catch (error) {
      logger.error('Failed to generate flashcards:', error);
      throw error;
    }
  }

  async generateQuiz(params: QuizParams): Promise<
    Array<{
      question: string;
      type: QuizType;
      options?: string[];
      answer: string;
      explanation: string;
    }>
  > {
    const startTime = Date.now();

    try {
      const prompt = promptTemplates.buildQuizPrompt(params.content, params.type);
      const promptTokens = TokenCounter.countTokens(prompt, params.model);

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Create quiz questions in the specified format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: params.temperature || 0.6,
        max_tokens: params.maxTokens || 2000,
      });

      const content = response.choices[0].message.content || '';
      const completionTokens = response.usage?.completion_tokens || 0;

      // Parse quiz questions from response
      const questions = this.parseQuizQuestions(content, params.type);

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.userId || 'system',
        requestType: 'quiz' as AIRequestType,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
      });

      // Cache quiz for future use
      if (params.userId) {
        const contentHash = crypto.createHash('sha256')
          .update(params.content)
          .digest('hex')
          .substring(0, 16);

        await this.cache.set(
          {
            service: 'quiz',
            userId: params.userId,
            contentHash,
            context: {
              difficulty: 'intermediate',
              format: `${params.type}_count_${params.count || 5}`
            }
          },
          JSON.stringify(questions),
          { promptTokens, completionTokens },
          {
            type: params.type,
            count: questions.length
          }
        );
      }

      return questions;
    } catch (error) {
      logger.error('Failed to generate quiz:', error);
      throw error;
    }
  }

  private calculateAvgDifficulty(flashcards: Array<{ difficulty: string }>): string {
    const difficultyScores: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
    const totalScore = flashcards.reduce((sum, card) => {
      return sum + (difficultyScores[card.difficulty] || 2);
    }, 0);
    const avgScore = totalScore / flashcards.length;
    
    if (avgScore <= 1.5) return 'easy';
    if (avgScore <= 2.5) return 'medium';
    return 'hard';
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

    const cardRegex = /FRONT:\s*(.+?)\s*BACK:\s*(.+?)(?=FRONT:|$)/gs;
    let match;

    while ((match = cardRegex.exec(content)) !== null) {
      const front = match[1].trim();
      const back = match[2].trim();

      // Simple difficulty heuristic based on content length
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (back.length < 50) difficulty = 'easy';
      else if (back.length > 150) difficulty = 'hard';

      flashcards.push({ front, back, difficulty });
    }

    return flashcards;
  }

  private parseQuizQuestions(
    content: string,
    type: QuizType
  ): Array<{
    question: string;
    type: QuizType;
    options?: string[];
    answer: string;
    explanation: string;
  }> {
    const questions: Array<{
      question: string;
      type: QuizType;
      options?: string[];
      answer: string;
      explanation: string;
    }> = [];

    // Split by question markers
    const questionBlocks = content.split(/Q:\s*/g).filter(Boolean);

    for (const block of questionBlocks) {
      if (type === QuizType.MULTIPLE_CHOICE) {
        const questionMatch = block.match(/^(.+?)\n/);
        const optionsMatch = block.match(/[A-D]\)\s*(.+?)(?=\n[A-D]\)|Correct:|$)/gs);
        const correctMatch = block.match(/Correct:\s*([A-D])/);
        const explanationMatch = block.match(/Explanation:\s*(.+?)$/s);

        if (questionMatch && optionsMatch && correctMatch && explanationMatch) {
          questions.push({
            question: questionMatch[1].trim(),
            type,
            options: optionsMatch.map((opt) => opt.replace(/^[A-D]\)\s*/, '').trim()),
            answer: correctMatch[1],
            explanation: explanationMatch[1].trim(),
          });
        }
      } else if (type === QuizType.TRUE_FALSE) {
        const questionMatch = block.match(/^(.+?)\nAnswer:/s);
        const answerMatch = block.match(/Answer:\s*(True|False)/);
        const explanationMatch = block.match(/Explanation:\s*(.+?)$/s);

        if (questionMatch && answerMatch && explanationMatch) {
          questions.push({
            question: questionMatch[1].trim(),
            type,
            answer: answerMatch[1],
            explanation: explanationMatch[1].trim(),
          });
        }
      } else if (type === QuizType.SHORT_ANSWER) {
        const questionMatch = block.match(/^(.+?)\nAnswer:/s);
        const answerMatch = block.match(/Answer:\s*(.+?)\nKey Points:/s);
        const keyPointsMatch = block.match(/Key Points:\s*(.+?)$/s);

        if (questionMatch && answerMatch) {
          questions.push({
            question: questionMatch[1].trim(),
            type,
            answer: answerMatch[1].trim(),
            explanation: keyPointsMatch ? keyPointsMatch[1].trim() : '',
          });
        }
      }
    }

    return questions;
  }

  async *streamChatResponse(params: {
    message: string;
    context: string[];
    currentPage?: number;
    selectedText?: string;
    persona: UserPersona | null;
    model?: string;
  }): AsyncGenerator<string> {
    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Build context-aware prompt
      const systemPrompt = `You are an AI study assistant helping a user understand educational content. 
${params.persona ? `The user is a ${params.persona.currentRole} in ${params.persona.industry}.` : ''}
${params.currentPage ? `They are currently on page ${params.currentPage}.` : ''}
${params.selectedText ? `They have highlighted: "${params.selectedText}"` : ''}

Use the following context to answer their question:
${params.context.slice(0, 3).join('\n\n')}

Guidelines:
- Be helpful and encouraging
- Use examples when appropriate
- Keep responses focused and relevant
- Cite specific parts of the context when answering`;

      const prompt = params.message;
      promptTokens = TokenCounter.countTokens(systemPrompt + prompt, params.model);

      // Create streaming completion
      const stream = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      });

      let fullContent = '';

      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield content;
        }
      }

      // Calculate completion tokens
      completionTokens = TokenCounter.countTokens(fullContent, params.model);

      // Track cost
      await this.costTracker.trackRequest({
        userId: params.persona?.userId || 'anonymous',
        requestType: 'CHAT' as any,
        model: params.model || 'gpt-4o',
        promptTokens,
        completionTokens,
        responseTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Failed to stream chat response:', error);
      throw error;
    }
  }
}
