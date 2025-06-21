/**
 * AI Learn - Outline Generation Routes
 * Handles outline generation using Python AI service with streaming support
 */

import { Router, Request, Response } from 'express';
import { authenticateSSE } from '../../middleware/sseAuth';
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

// SSE helper to send events
const sendSSE = (res: Response, event: string, data: SSEData) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Generate outline for a file using Python AI service
 * Supports streaming responses for real-time progress
 */
router.get(
  '/generate-outline',
  authenticateSSE,
  aiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.query;
    const userId = (req as AuthenticatedRequest).user.id;

    logger.info('[AI Learn Outline] Generate outline request:', { fileId, userId });

    if (!fileId) {
      res.status(400).json({ error: 'File ID is required' });
      return;
    }

    try {
      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send initial event
      sendSSE(res, 'message', { type: 'outline-start' });

      // Check cache first with personalized key
      const cacheOptions = {
        service: 'explain' as const,
        userId,
        contentHash: fileId as string,
        context: {
          moduleId: fileId as string,
        },
      };
      const cachedOutline = await enhancedAICache.get(cacheOptions);

      if (cachedOutline) {
        logger.info('[AI Learn Outline] Using cached outline');
        const topics = JSON.parse(cachedOutline.content).topics || [];

        // Stream cached topics
        for (const topic of topics) {
          sendSSE(res, 'message', { type: 'topic', data: topic });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        sendSSE(res, 'message', { type: 'complete', data: { cached: true } });
        res.end();
        return;
      }

      // Get file and its chunks
      const { data: file, error: fileError } = await supabase
        .from('course_files')
        .select('*, chunks:file_chunks(*)')
        .eq('id', fileId)
        .order('chunk_index', { foreignTable: 'file_chunks', ascending: true })
        .single();

      if (fileError || !file) {
        logger.error('[AI Learn Outline] File not found:', fileError);
        sendSSE(res, 'message', { type: 'error', data: { message: 'File not found' } });
        res.end();
        return;
      }

      logger.info('[AI Learn Outline] File found:', {
        id: file.id,
        filename: file.filename,
        chunksCount: file.chunks?.length || 0,
      });

      // Validate chunks exist
      if (!file.chunks || file.chunks.length === 0) {
        logger.error('[AI Learn Outline] No chunks found for file:', fileId);
        sendSSE(res, 'message', {
          type: 'error',
          data: {
            message:
              'File has not been processed yet. Please wait for file processing to complete.',
          },
        });
        res.end();
        return;
      }

      // Prepare content for Python AI service
      const chunks = file.chunks.map((c: FileChunk) => c.content).join('\n\n');
      const content = chunks.substring(0, 8000); // Limit for context window

      // Get user persona for personalization
      const { data: persona } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .single();

      const transformedPersona = persona
        ? {
            id: persona.id,
            userId: persona.user_id,
            currentRole: persona.professional_context?.role,
            industry: persona.professional_context?.industry,
            technicalLevel: persona.professional_context?.technicalLevel,
            primaryInterests: persona.personal_interests?.primary || [],
            secondaryInterests: persona.personal_interests?.secondary || [],
            learningStyle: persona.learning_style?.primary,
            communicationTone: persona.communication_tone?.style,
            createdAt: new Date(persona.created_at),
            updatedAt: new Date(persona.updated_at),
          }
        : undefined;

      sendSSE(res, 'message', { type: 'generating' });

      // Use Python AI service to generate outline
      const generator = pythonAIClient.generateContent({
        content,
        content_type: 'outline',
        topic: file.filename || 'Document',
        difficulty: 'intermediate',
        persona: transformedPersona,
        model: 'gpt-4o',
        temperature: 0.7,
        stream: true,
        user_id: userId,
      });

      const topics: unknown[] = [];
      let currentTopic = '';

      // Process streaming response
      for await (const chunk of generator) {
        if (chunk.error) {
          logger.error('[AI Learn Outline] Python AI error:', chunk.error);
          sendSSE(res, 'message', { type: 'error', data: { message: chunk.error } });
          res.end();
          return;
        }

        if (chunk.content) {
          currentTopic += chunk.content;

          // Try to parse partial JSON for progressive loading
          try {
            const parsed = JSON.parse(currentTopic);
            if (parsed.topics && Array.isArray(parsed.topics)) {
              // Stream new topics as they're completed
              for (let i = topics.length; i < parsed.topics.length; i++) {
                const topic = parsed.topics[i];
                topics.push(topic);

                // Ensure proper ID format
                topic.id = topic.id || `topic-${i + 1}`;

                // Ensure subtopics have proper IDs
                if (topic.subtopics) {
                  topic.subtopics = topic.subtopics.map(
                    (st: { id?: string; type: string; [key: string]: unknown }) => ({
                      ...st,
                      id: st.id || `${st.type}-${i + 1}`,
                    })
                  );
                }

                sendSSE(res, 'message', { type: 'topic', data: topic });
                await new Promise((resolve) => setTimeout(resolve, 300));
              }
            }
          } catch {
            // Incomplete JSON, continue accumulating
          }
        }

        if (chunk.done) {
          break;
        }
      }

      // Final parsing and validation
      let finalTopics: unknown[] = topics;
      if (currentTopic && !topics.length) {
        try {
          const parsed = JSON.parse(currentTopic);
          finalTopics = Array.isArray(parsed) ? parsed : parsed.topics || [];
        } catch (error) {
          logger.error('[AI Learn Outline] Failed to parse final response:', error);
          sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to parse outline' } });
          res.end();
          return;
        }
      }

      if (!finalTopics.length) {
        logger.error('[AI Learn Outline] No topics generated');
        sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to generate topics' } });
        res.end();
        return;
      }

      // Cache the result with personalization
      await enhancedAICache.set(
        cacheOptions,
        JSON.stringify({ topics: finalTopics }),
        { promptTokens: 100, completionTokens: 200 }, // Estimated usage
        { cost: 0.01 }
      );

      logger.info('[AI Learn Outline] Generated topics:', finalTopics.length);

      // Send completion event
      sendSSE(res, 'message', { type: 'complete' });
      res.end();
    } catch (error) {
      logger.error('[AI Learn Outline] Error generating outline:', error);
      sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to generate outline' } });
      res.end();
    }
  }
);

export default router;
