import { Request, Response } from 'express';
import { z } from 'zod';
import { ContentGenerationService } from '../services/content/ContentGenerationService';
import { HybridSearchService } from '../services/search/HybridSearchService';
import { PersonalizationEngine } from '../services/personalization/PersonalizationEngine';
import { CostTracker } from '../services/ai/CostTracker';
import { aiErrorHandler } from '../services/ai/ErrorHandler';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { QuizType } from '../services/ai/PromptTemplates';
import { redisClient } from '../config/redis';
import { supabase } from '../config/supabase';

// Initialize services using centralized Redis client
const contentService = new ContentGenerationService(redisClient);
const searchService = new HybridSearchService();
const personalizationEngine = new PersonalizationEngine();
const costTracker = new CostTracker();

// Validation schemas
const explainSchema = z.object({
  fileId: z.string().uuid().optional(),
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
      const { topicId, fileId, subtopic } = explainSchema.parse(req.body);
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

      // Search for relevant chunks using semantic search
      const searchQuery = subtopic ? `${topicId} ${subtopic}` : topicId;
      const searchResponse = await searchService.search(searchQuery, userId, {
        filters: fileId ? { fileId } : {},
        limit: 10,
        searchType: 'hybrid',
        includeContent: true,
        weightVector: 0.8, // Prioritize semantic understanding for explanations
        weightKeyword: 0.2
      });

      const chunks = searchResponse.results.map(result => ({
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        score: result.score
      }));

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
      const { fileId, format } = summarizeSchema.parse(req.body);
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

      // Get all file chunks with semantic understanding
      const searchResponse = await searchService.search('', userId, {
        filters: { fileId },
        limit: 100, // Get all chunks for comprehensive summary
        searchType: 'keyword', // Get all chunks, not just semantically similar
        includeContent: true
      });

      if (searchResponse.results.length === 0) {
        throw new AppError('No content found for this file', 404);
      }

      // Sort chunks by index to maintain document order
      const sortedChunks = searchResponse.results.sort((a, b) => 
        a.metadata.chunkIndex - b.metadata.chunkIndex
      );

      // Combine content intelligently based on chunk types
      const content = this.combineChunksIntelligently(sortedChunks);

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
      const { fileId, chunkIds } = flashcardSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check user budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        throw new AppError('Daily AI usage limit exceeded', 429);
      }

      let content: string;

      if (chunkIds && chunkIds.length > 0) {
        // Get specific chunks for targeted flashcards
        const chunks = await this.getChunksByIds(chunkIds);
        content = chunks.map(c => c.content).join('\n\n');
      } else {
        // Get important chunks for flashcard generation
        const searchResponse = await searchService.search('key concepts definitions important', userId, {
          filters: { 
            fileId,
            contentTypes: ['definition', 'summary'] as any,
            importance: ['high', 'medium']
          },
          limit: 20,
          searchType: 'hybrid',
          weightVector: 0.6,
          weightKeyword: 0.4
        });

        if (searchResponse.results.length === 0) {
          throw new AppError('No suitable content found for flashcard generation', 404);
        }

        content = searchResponse.results
          .map(r => `${r.metadata.sectionTitle ? `[${r.metadata.sectionTitle}]\n` : ''}${r.content}`)
          .join('\n\n');
      }

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
      const { fileId, type, chunkIds } = quizSchema.parse(req.body);
      const userId = (req as any).user.id;

      // Check user budget
      const budgetCheck = await costTracker.checkUserLimit(userId);
      if (!budgetCheck.allowed) {
        throw new AppError('Daily AI usage limit exceeded', 429);
      }

      let content: string;

      if (chunkIds && chunkIds.length > 0) {
        // Get specific chunks for targeted quiz
        const chunks = await this.getChunksByIds(chunkIds);
        content = chunks.map(c => c.content).join('\n\n');
      } else {
        // Get diverse content for comprehensive quiz
        const searchResponse = await searchService.search('', userId, {
          filters: { 
            fileId,
            contentTypes: ['definition', 'explanation', 'example', 'theory'],
            importance: ['high', 'medium']
          },
          limit: 30,
          searchType: 'keyword', // Get a good spread of content
          includeContent: true
        });

        if (searchResponse.results.length === 0) {
          throw new AppError('No suitable content found for quiz generation', 404);
        }

        // Select diverse chunks for balanced quiz
        const diverseChunks = this.selectDiverseChunks(searchResponse.results, 15);
        content = diverseChunks
          .map(r => `${r.metadata.sectionTitle ? `[${r.metadata.sectionTitle}]\n` : ''}${r.content}`)
          .join('\n\n');
      }

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

      const searchResponse = await searchService.search(query, userId, {
        filters: fileId ? { fileId } : {},
        limit
      });
      const results = searchResponse.results;

      // Log search activity
      logger.info(`Search query: ${query}, results: ${results.length}, userId: ${userId}`);

      res.json({
        success: true,
        data: {
          results,
          query,
          count: searchResponse.totalCount,
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
      const searchResponse = await searchService.search('', (req as any).user.id, {
        filters: { fileId },
        limit: 1000,
        includeContent: true
      });
      const chunks = searchResponse.results;

      if (!chunks || chunks.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No content found for this file.',
        });
        return;
      }

      // Group chunks into semantic sections using metadata
      const sections = this.clusterChunksByMetadata(chunks);

      // Generate section titles and summaries
      const outline = await Promise.all(
        sections.map(async (section: any) => ({
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
      const contextResponse = await searchService.search(params.message, userId, {
        filters: params.fileId ? { fileId: params.fileId } : {},
        limit: 10
      });
      const context = contextResponse.results;

      // Get user persona
      const persona = params.personaId
        ? await personalizationEngine.getPersona(params.personaId)
        : await personalizationEngine.getLatestPersona(userId);

      // Stream chat response
      const chatParams = {
        message: params.message,
        context: context.map((r: any) => r.content),
        currentPage: params.currentPage,
        selectedText: params.selectedText,
        persona,
        model: 'gpt-4o',
      };

      for await (const chunk of contentService.streamChatResponse(chatParams)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Send citations
      const citations = context.slice(0, 3).map((r: any) => ({
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

  private clusterChunksByMetadata(chunks: any[]): any[] {
    // Group chunks by section title and hierarchy level
    const sections = new Map<string, any>();
    
    chunks.forEach((chunk) => {
      const sectionTitle = chunk.metadata?.sectionTitle || 'Untitled Section';
      const hierarchyLevel = chunk.metadata?.hierarchyLevel || 1;
      
      if (!sections.has(sectionTitle)) {
        sections.set(sectionTitle, {
          id: `section-${sections.size}`,
          suggestedTitle: sectionTitle,
          summary: '',
          chunkIds: [],
          chunkCount: 0,
          startPage: chunk.metadata?.page || 0,
          endPage: chunk.metadata?.page || 0,
          topics: chunk.metadata?.concepts || [],
          hierarchyLevel
        });
      }
      
      const section = sections.get(sectionTitle)!;
      section.chunkIds.push(chunk.id);
      section.chunkCount++;
      section.endPage = Math.max(section.endPage, chunk.metadata?.page || 0);
      
      // Merge topics
      if (chunk.metadata?.concepts) {
        section.topics = [...new Set([...section.topics, ...chunk.metadata.concepts])];
      }
    });
    
    return Array.from(sections.values());
  }

  private combineChunksIntelligently(chunks: any[]): string {
    // Group by content type and section
    const sections = new Map<string, any[]>();
    
    chunks.forEach(chunk => {
      const section = chunk.metadata?.sectionTitle || 'Main Content';
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(chunk);
    });

    // Build content with proper structure
    let combinedContent = '';
    sections.forEach((sectionChunks, sectionTitle) => {
      if (sectionTitle !== 'Main Content') {
        combinedContent += `\n## ${sectionTitle}\n\n`;
      }

      // Sort by importance and content type
      const sortedChunks = sectionChunks.sort((a, b) => {
        const importanceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const aImportance = importanceOrder[a.metadata?.importance as keyof typeof importanceOrder || 'medium'];
        const bImportance = importanceOrder[b.metadata?.importance as keyof typeof importanceOrder || 'medium'];
        
        if (aImportance !== bImportance) return aImportance - bImportance;
        return a.metadata.chunkIndex - b.metadata.chunkIndex;
      });

      sortedChunks.forEach(chunk => {
        if (chunk.metadata?.contentType === 'definition') {
          combinedContent += `**Definition:** ${chunk.content}\n\n`;
        } else if (chunk.metadata?.contentType === 'summary') {
          combinedContent += `**Summary:** ${chunk.content}\n\n`;
        } else {
          combinedContent += `${chunk.content}\n\n`;
        }
      });
    });

    return combinedContent.trim();
  }

  private async getChunksByIds(chunkIds: string[]): Promise<any[]> {
    const { data, error } = await supabase
      .from('file_chunks')
      .select('*')
      .in('id', chunkIds);

    if (error) {
      logger.error('Failed to get chunks by IDs:', error);
      throw new AppError('Failed to retrieve content chunks', 500);
    }

    return data || [];
  }

  private selectDiverseChunks(chunks: any[], targetCount: number): any[] {
    // Group by content type
    const typeGroups = new Map<string, any[]>();
    chunks.forEach(chunk => {
      const type = chunk.metadata?.contentType || 'general';
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(chunk);
    });

    // Select proportionally from each type
    const selected: any[] = [];
    const typesCount = typeGroups.size;
    const perType = Math.floor(targetCount / typesCount);
    const extra = targetCount % typesCount;

    let typeIndex = 0;
    typeGroups.forEach((typeChunks, _type) => {
      const count = typeIndex < extra ? perType + 1 : perType;
      const shuffled = typeChunks.sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, count));
      typeIndex++;
    });

    return selected.slice(0, targetCount);
  }
}

export const aiController = new AIController();
