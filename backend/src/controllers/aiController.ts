import { Request, Response } from 'express';
import { z } from 'zod';
import Redis from 'ioredis';
import { ContentGenerationService } from '../services/content/ContentGenerationService';
import { HybridSearchService } from '../services/search/HybridSearchService';
import { PersonalizationEngine } from '../services/personalization/PersonalizationEngine';
import { CostTracker } from '../services/ai/CostTracker';
import { aiErrorHandler } from '../services/ai/ErrorHandler';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { QuizType } from '../services/ai/PromptTemplates';

// Initialize services
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const contentService = new ContentGenerationService(redis);
const searchService = new HybridSearchService();
const personalizationEngine = new PersonalizationEngine();
const costTracker = new CostTracker();

// Validation schemas
const explainSchema = z.object({
  fileId: z.string().uuid(),
  topicId: z.string(),
  subtopic: z.string().optional(),
});

const summarizeSchema = z.object({
  fileId: z.string().uuid(),
  format: z.enum(['key-points', 'comprehensive', 'visual-map']),
});

const flashcardSchema = z.object({
  fileId: z.string().uuid(),
  chunkIds: z.array(z.string().uuid()).optional(),
});

const quizSchema = z.object({
  fileId: z.string().uuid(),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  chunkIds: z.array(z.string().uuid()).optional(),
});

const searchSchema = z.object({
  query: z.string().min(2),
  fileId: z.string().uuid(),
  limit: z.number().min(1).max(50).optional(),
});

const feedbackSchema = z.object({
  contentId: z.string(),
  helpful: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  comments: z.string().optional(),
});

export class AIController {
  async streamExplanation(req: Request, res: Response): Promise<void> {
    try {
      const { topicId } = explainSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check user budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        throw new AppError('Daily AI usage limit exceeded', 429);
      }

      // Get user persona
      const persona = await personalizationEngine.getUserPersona(userId);
      if (!persona) {
        throw new AppError('User persona not found. Please complete onboarding.', 400);
      }

      // TODO: Get chunks for the topic
      const chunks: Array<{ id: string; content: string }> = []; // This should be fetched based on topicId

      if (chunks.length === 0) {
        throw new AppError('No content found for this topic', 404);
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Stream explanation
      const generator = contentService.generateExplanation({
        chunks,
        topic: topicId,
        persona,
        stream: true,
      });

      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      logger.error('Stream explanation error:', error);
      const errorResponse = aiErrorHandler.handle(error);

      if (!res.headersSent) {
        res.status(error instanceof AppError ? error.statusCode : 500).json(errorResponse);
      } else {
        res.write(`data: ${JSON.stringify({ error: errorResponse.error })}\n\n`);
        res.end();
      }
    }
  }

  async generateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { format } = summarizeSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check user budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        throw new AppError('Daily AI usage limit exceeded', 429);
      }

      // Get user persona
      const persona = await personalizationEngine.getUserPersona(userId);
      if (!persona) {
        throw new AppError('User persona not found', 400);
      }

      // TODO: Get file content
      const content = ''; // This should be fetched from file chunks

      const summary = await contentService.generateSummary({
        content,
        format,
        persona,
      });

      res.json({
        success: true,
        data: {
          summary,
          format,
        },
      });
    } catch (error) {
      logger.error('Generate summary error:', error);
      const errorResponse = aiErrorHandler.handle(error);
      res.status(error instanceof AppError ? error.statusCode : 500).json(errorResponse);
    }
  }

  async generateFlashcards(req: Request, res: Response): Promise<void> {
    try {
      flashcardSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check user budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        throw new AppError('Daily AI usage limit exceeded', 429);
      }

      // TODO: Get content from chunks
      const content = ''; // This should be fetched based on chunkIds or fileId

      const flashcards = await contentService.generateFlashcards({
        content,
      });

      res.json({
        success: true,
        data: {
          flashcards,
          count: flashcards.length,
        },
      });
    } catch (error) {
      logger.error('Generate flashcards error:', error);
      const errorResponse = aiErrorHandler.handle(error);
      res.status(error instanceof AppError ? error.statusCode : 500).json(errorResponse);
    }
  }

  async generateQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { type } = quizSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check user budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        throw new AppError('Daily AI usage limit exceeded', 429);
      }

      // TODO: Get content from chunks
      const content = ''; // This should be fetched based on chunkIds or fileId

      const quizType = type as QuizType;
      const questions = await contentService.generateQuiz({
        content,
        type: quizType,
      });

      res.json({
        success: true,
        data: {
          questions,
          type,
          count: questions.length,
        },
      });
    } catch (error) {
      logger.error('Generate quiz error:', error);
      const errorResponse = aiErrorHandler.handle(error);
      res.status(error instanceof AppError ? error.statusCode : 500).json(errorResponse);
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, fileId, limit } = searchSchema.parse(req.query);
      const userId = (req as any).user.id;

      const results = await searchService.search(query, fileId, userId, limit);

      // Log search
      await searchService.logSearch(query, results.length, userId);

      res.json({
        success: true,
        data: {
          results,
          query,
          count: results.length,
        },
      });
    } catch (error) {
      logger.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed. Please try again.',
      });
    }
  }

  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const feedback = feedbackSchema.parse(req.body);
      const userId = (req as any).user.id;

      await personalizationEngine.saveContentFeedback({
        userId,
        ...feedback,
      });

      res.json({
        success: true,
        message: 'Feedback received. Thank you!',
      });
    } catch (error) {
      logger.error('Feedback submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback.',
      });
    }
  }

  async getCosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const isAdmin = (req as any).user.role === 'admin';

      const stats = await costTracker.getDashboardStats(isAdmin ? undefined : userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get costs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cost data.',
      });
    }
  }

  async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const [userSpend, budgetCheck, metrics] = await Promise.all([
        costTracker.getUserDailySpend(userId),
        costTracker.checkUserLimit(userId),
        personalizationEngine.getPersonalizationMetrics(userId),
      ]);

      res.json({
        success: true,
        data: {
          dailySpend: userSpend,
          dailyLimit: parseFloat(process.env.AI_USER_DAILY_LIMIT_USD || '5'),
          remainingBudget: budgetCheck.remainingBudget,
          personalizationMetrics: metrics,
        },
      });
    } catch (error) {
      logger.error('Get usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage data.',
      });
    }
  }

  async generateOutline(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      // const userId = (req as any).user.id;

      // Fetch file chunks with embeddings
      const chunks = await searchService.getFileChunks(fileId);

      if (!chunks || chunks.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No content found for this file.',
        });
        return;
      }

      // Group chunks into semantic sections using embeddings
      const sections = await searchService.clusterChunks(chunks);

      // Generate section titles and summaries
      const outline = await Promise.all(
        sections.map(async (section) => ({
          id: section.id,
          title: section.suggestedTitle,
          summary: section.summary,
          chunkIds: section.chunkIds,
          chunkCount: section.chunkIds.length,
          startPage: section.startPage,
          endPage: section.endPage,
          topics: section.topics,
        }))
      );

      res.json({
        success: true,
        data: {
          fileId,
          sections: outline,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Generate outline error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate outline.',
      });
    }
  }

  async streamChat(req: Request, res: Response): Promise<void> {
    try {
      const chatSchema = z.object({
        fileId: z.string().uuid(),
        message: z.string().min(1),
        currentPage: z.number().optional(),
        selectedText: z.string().optional(),
        personaId: z.string().uuid().optional(),
      });

      const params = chatSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        res.status(429).json({
          success: false,
          error: 'Daily AI budget exceeded. Please try again tomorrow.',
        });
        return;
      }

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Get relevant context
      const context = await searchService.search(params.message, params.fileId, userId, 10);

      // Get user persona
      const persona = params.personaId
        ? await personalizationEngine.getPersona(params.personaId)
        : await personalizationEngine.getLatestPersona(userId);

      // Stream chat response
      const chatParams = {
        message: params.message,
        context: context.map((r) => r.content),
        currentPage: params.currentPage,
        selectedText: params.selectedText,
        persona,
        model: 'gpt-4o',
      };

      for await (const chunk of contentService.streamChatResponse(chatParams)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Send citations
      const citations = context.slice(0, 3).map((r) => ({
        chunkId: r.chunkId,
        page: r.metadata?.page || 0,
        text: r.content.substring(0, 100),
      }));

      res.write(`data: ${JSON.stringify({ citations })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      const handledError = aiErrorHandler.handle(error);
      logger.error('Chat error:', error);

      res.write(`data: ${JSON.stringify({ error: handledError.error })}\n\n`);
      res.end();
    }
  }
}

export const aiController = new AIController();
