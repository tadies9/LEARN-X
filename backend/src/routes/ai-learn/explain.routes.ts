/**
 * AI Learn - Explanation and Content Streaming Routes
 * Handles personalized content generation using Python AI service
 */

import { Router, Request, Response } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { aiRateLimiter } from '../../middleware/rateLimiter';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { pythonAIClient } from '../../services/ai/PythonAIClient';
import { EnhancedAICache } from '../../services/cache/EnhancedAICache';
import { CostTracker } from '../../services/ai/CostTracker';
import { redisClient } from '../../config/redis';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

interface SSEData {
  type: string;
  data?: unknown;
  message?: string;
}

interface FileChunk {
  id: string;
  content: string;
  chunk_index: number;
  content_type?: string;
  importance?: string;
}

const router = Router();

// Initialize services
const costTracker = new CostTracker();
const enhancedAICache = new EnhancedAICache(redisClient, costTracker);

// SSE helper to send events with explicit flushing
const sendSSE = (res: Response, event: string, data: SSEData) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  res.write(message);

  // Force flush if available
  if ((res as any).flush) {
    (res as any).flush();
  }
};

/**
 * Get user persona and transform it to expected format
 */
async function getUserPersona(userId: string) {
  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!persona) {
    return null;
  }

  // Return the raw persona data with all 5 dimensions for PersonaPromptBuilder
  return {
    id: persona.id,
    user_id: persona.user_id,
    professional_context: persona.professional_context || {},
    personal_interests: persona.personal_interests || {},
    learning_style: persona.learning_style || {},
    content_preferences: persona.content_preferences || {},
    communication_tone: persona.communication_tone || {},
    created_at: persona.created_at,
    updated_at: persona.updated_at,
  };
}

/**
 * Generate cache key for personalized content
 */
function generateCacheOptions(
  fileId: string,
  topicId: string,
  subtopic: string,
  mode: string,
  userId: string
) {
  return {
    service: 'explain' as const,
    userId,
    contentHash: `${fileId}:${topicId}:${subtopic}:${mode}`,
    context: {
      moduleId: fileId,
      difficulty: mode,
    },
  };
}

/**
 * Stream personalized content for a topic/subtopic using Python AI service
 */
router.post(
  '/stream',
  authenticateUser,
  aiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId, topicId, subtopic, mode } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    logger.info('[AI Learn Explain] Stream request:', { fileId, topicId, subtopic, mode, userId });

    if (!fileId || !topicId) {
      res.status(400).json({
        error: 'Missing required parameters: fileId and topicId are required',
      });
      return;
    }

    try {
      // Set up SSE with writeHead for immediate header sending
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
        'Access-Control-Allow-Origin': '*',
      });

      // Write a comment to establish the connection
      res.write(':ok\n\n');
      
      // Send initial message to confirm connection
      sendSSE(res, 'message', { type: 'connected', data: 'SSE connection established' });

      // Check cache first with personalized key
      const cacheOptions = generateCacheOptions(
        fileId,
        topicId,
        subtopic || '',
        mode || 'explain',
        userId
      );
      const cachedContent = await enhancedAICache.get(cacheOptions);

      if (cachedContent) {
        logger.info('[AI Learn Explain] Using cached content');
        sendSSE(res, 'message', { type: 'content', data: cachedContent.content });
        sendSSE(res, 'message', { type: 'complete', data: { cached: true } });
        res.end();
        return;
      }

      // Get file chunks
      const { data: file, error: fileError } = await supabase
        .from('course_files')
        .select('*, chunks:file_chunks(*)')
        .eq('id', fileId)
        .order('chunk_index', { foreignTable: 'file_chunks', ascending: true })
        .single();

      if (fileError || !file) {
        sendSSE(res, 'message', { type: 'error', data: { message: 'File not found' } });
        res.end();
        return;
      }

      // Get user persona
      const persona = await getUserPersona(userId);
      if (!persona) {
        sendSSE(res, 'message', {
          type: 'error',
          data: { message: 'User persona not found. Please complete onboarding.' },
        });
        res.end();
        return;
      }

      logger.info('[AI Learn Explain] User persona loaded:', {
        userId,
        professionalContext: persona.professional_context,
        learningStyle: persona.learning_style?.primary,
        communicationTone: persona.communication_tone?.style,
        contentDensity: persona.content_preferences?.density,
        primaryInterests: persona.personal_interests?.primary,
      });

      // Prepare content from chunks
      const chunks =
        file.chunks
          ?.slice(0, 10)
          .map((c: FileChunk) => c.content)
          .join('\n\n') || '';
      const content = chunks.substring(0, 8000); // Limit for context window

      // Determine content type and difficulty based on mode
      const contentTypeMap: Record<string, string> = {
        explain: 'explanation',
        summary: 'summary',
        flashcards: 'flashcards',
        quiz: 'quiz',
        examples: 'examples',
        practice: 'practice',
      };

      const difficultyMap: Record<string, string> = {
        summary: 'beginner',
        explain: 'intermediate',
        examples: 'intermediate',
        practice: 'advanced',
        quiz: 'advanced',
        flashcards: 'intermediate',
      };

      const contentType = contentTypeMap[mode || 'explain'] || 'explanation';
      const difficulty = difficultyMap[mode || 'explain'] || 'intermediate';

      logger.info(
        `[AI Learn Explain] Generating ${contentType} content using Python AI service...`
      );

      // Use Python AI service to generate content
      const generator = pythonAIClient.generateContent({
        content,
        content_type: contentType as any,
        topic: topicId,
        difficulty: difficulty as any,
        persona,
        model: 'gpt-4o',
        temperature: 0.7,
        stream: true,
        user_id: userId,
      });

      let accumulatedContent = '';
      let tokenCount = 0;

      // Process streaming response
      let chunkCount = 0;
      for await (const chunk of generator) {
        if (chunk.error) {
          logger.error('[AI Learn Explain] Python AI error:', chunk.error);
          sendSSE(res, 'message', { type: 'error', data: { message: chunk.error } });
          res.end();
          return;
        }

        if (chunk.content) {
          chunkCount++;
          accumulatedContent += chunk.content;
          tokenCount += chunk.content.split(' ').length; // Rough token estimation

          // Format content based on mode
          let formattedContent = chunk.content;

          if (mode === 'flashcards') {
            // Wrap in flashcard formatting if it looks like a complete card
            if (chunk.content.includes('Q:') || chunk.content.includes('A:')) {
              formattedContent = `<div style="border: 1px solid #ddd; padding: 16px; margin: 8px 0; border-radius: 8px;">${chunk.content}</div>`;
            }
          } else if (mode === 'quiz') {
            // Wrap in quiz formatting
            if (chunk.content.includes('Question') || chunk.content.includes('Answer')) {
              formattedContent = `<div style="margin-bottom: 24px;">${chunk.content}</div>`;
            }
          }

          logger.info(
            `[AI Learn Explain] Sending chunk ${chunkCount}: ${chunk.content.substring(0, 50)}...`
          );
          sendSSE(res, 'message', { type: 'content', data: formattedContent });
        }

        if (chunk.done) {
          logger.info(`[AI Learn Explain] Stream done after ${chunkCount} chunks`);
          break;
        }
      }

      // Track costs
      await costTracker.trackRequest({
        userId,
        requestType: 'explain',
        model: 'gpt-4o',
        promptTokens: Math.ceil(tokenCount / 4),
        completionTokens: Math.ceil(accumulatedContent.length / 20),
        responseTimeMs: 1000, // Simplified timing
        cacheHit: false,
      });

      // Cache the complete result with personalization
      if (accumulatedContent) {
        await enhancedAICache.set(
          cacheOptions,
          accumulatedContent,
          {
            promptTokens: Math.ceil(tokenCount / 4),
            completionTokens: Math.ceil(accumulatedContent.length / 20),
          },
          { cost: tokenCount * 0.000005 }
        );
      }

      logger.info('[AI Learn Explain] Content generation completed:', {
        userId,
        mode,
        contentLength: accumulatedContent.length,
        tokenCount,
      });

      // Send completion signal
      sendSSE(res, 'message', { type: 'complete' });
      res.end();
    } catch (error) {
      logger.error('[AI Learn Explain] Error streaming content:', error);
      sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to stream content' } });
      res.end();
    }
  }
);

/**
 * Regenerate content with feedback using Python AI service
 */
router.post(
  '/regenerate',
  authenticateUser,
  aiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId, topicId, subtopic, mode, feedback } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    logger.info('[AI Learn Explain] Regenerate request:', { fileId, topicId, feedback });

    if (!fileId || !topicId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      // Invalidate existing cache
      const cacheOptions = generateCacheOptions(
        fileId,
        topicId,
        subtopic || '',
        mode || 'explain',
        userId
      );
      // Note: EnhancedAICache doesn't support selective invalidation,
      // so we'll let the cache expire naturally or clear user cache manually

      // Set up SSE for regeneration
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

      // Flush headers immediately
      res.flushHeaders();

      sendSSE(res, 'message', {
        type: 'regeneration-start',
        data: { message: 'Regenerating content with feedback...' },
      });

      // Get file and persona (similar to stream endpoint)
      const { data: file, error: fileError } = await supabase
        .from('course_files')
        .select('*, chunks:file_chunks(*)')
        .eq('id', fileId)
        .single();

      if (fileError || !file) {
        sendSSE(res, 'message', { type: 'error', data: { message: 'File not found' } });
        res.end();
        return;
      }

      const persona = await getUserPersona(userId);
      if (!persona) {
        sendSSE(res, 'message', { type: 'error', data: { message: 'User persona not found' } });
        res.end();
        return;
      }

      // Prepare content with feedback incorporated
      const chunks =
        file.chunks
          ?.slice(0, 10)
          .map((c: FileChunk) => c.content)
          .join('\n\n') || '';
      const contentWithFeedback = `${chunks.substring(0, 7000)}\n\nUser Feedback: ${feedback}`;

      // Generate improved content
      const generator = pythonAIClient.generateContent({
        content: contentWithFeedback,
        content_type:
          mode === 'quiz' ? 'quiz' : mode === 'flashcards' ? 'flashcards' : 'explanation',
        topic: `${topicId} (Improved)`,
        difficulty: 'intermediate',
        persona,
        model: 'gpt-4o',
        temperature: 0.8, // Slightly higher for variation
        stream: true,
        user_id: userId,
      });

      let newContent = '';

      for await (const chunk of generator) {
        if (chunk.error) {
          sendSSE(res, 'message', { type: 'error', data: { message: chunk.error } });
          res.end();
          return;
        }

        if (chunk.content) {
          newContent += chunk.content;
          sendSSE(res, 'message', { type: 'content', data: chunk.content });
        }

        if (chunk.done) {
          break;
        }
      }

      // Cache the regenerated content
      if (newContent) {
        await enhancedAICache.set(
          cacheOptions,
          newContent,
          { promptTokens: 50, completionTokens: 100 },
          { cost: 0.01 }
        );
      }

      sendSSE(res, 'message', { type: 'complete', data: { regenerated: true } });
      res.end();
    } catch (error) {
      logger.error('[AI Learn Explain] Error regenerating content:', error);
      sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to regenerate content' } });
      res.end();
    }
  }
);

export default router;
