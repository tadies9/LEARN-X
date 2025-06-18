import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { authenticateSSE } from '../middleware/sseAuth';
import { supabase } from '../config/supabase';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { StreamingExplanationService } from '../services/content/core/StreamingExplanationService';
import { AICache } from '../services/cache/AICache';
import { CostTracker } from '../services/ai/CostTracker';
import { redisClient } from '../config/redis';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
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

interface CourseFile {
  id: string;
  filename: string;
  chunks?: FileChunk[];
}

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize the StreamingExplanationService with proper dependencies
const aiCache = new AICache(redisClient);
const costTracker = new CostTracker();
const streamingExplanationService = new StreamingExplanationService(aiCache, costTracker);

// SSE helper to send events
const sendSSE = (res: Response, event: string, data: SSEData) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

// Test endpoint
router.get('/test', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'AI Learn routes are working!' });
});

// Test SSE endpoint (no auth)
router.get('/test-sse', (_req: Request, res: Response) => {
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send test events
  sendSSE(res, 'message', { type: 'test', data: 'SSE is working!' });
  setTimeout(() => {
    sendSSE(res, 'message', { type: 'complete' });
    res.end();
  }, 1000);
});

// Generate outline for a file
router.get(
  '/generate-outline',
  authenticateSSE,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.query;
    const userId = (req as AuthenticatedRequest).user.id;

    logger.info('[AI Learn] Generate outline request:', { fileId, userId });

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

      // Get file and its chunks
      const { data: file, error: fileError } = await supabase
        .from('course_files')
        .select('*, chunks:file_chunks(*)')
        .eq('id', fileId)
        .order('chunk_index', { foreignTable: 'file_chunks', ascending: true })
        .single();

      if (fileError || !file) {
        console.error('[AI Learn] File not found:', fileError);
        sendSSE(res, 'message', { type: 'error', data: { message: 'File not found' } });
        res.end();
        return;
      }

      logger.info('[AI Learn] File found:', {
        id: file.id,
        filename: file.filename,
        chunksCount: file.chunks?.length || 0,
      });

      // Extract topics from chunks using GPT-4o
      if (!file.chunks || file.chunks.length === 0) {
        console.error('[AI Learn] No chunks found for file:', fileId);
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

      const chunks = file.chunks.map((c: FileChunk) => c.content).join('\n\n');

      const topicPrompt = `Analyze this document and create a learning outline with 4-6 main topics.

Document content:
${chunks.substring(0, 8000)} // Limit for context window

For each topic, provide:
1. A clear, descriptive title
2. 5 subtopics: intro, concepts, examples, practice, summary

Return a JSON object with a "topics" array containing objects with this structure:
{
  "topics": [{
    "id": "topic-1",
    "title": "Topic Title Here",
    "subtopics": [
      {"id": "intro-1", "title": "Introduction", "type": "intro", "completed": false},
      {"id": "concepts-1", "title": "Core Concepts", "type": "concepts", "completed": false},
      {"id": "examples-1", "title": "Examples", "type": "examples", "completed": false},
      {"id": "practice-1", "title": "Practice", "type": "practice", "completed": false},
      {"id": "summary-1", "title": "Summary", "type": "summary", "completed": false}
    ],
    "progress": 0
  }]
}`;

      logger.info('[AI Learn] Generating outline with GPT-4o...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: topicPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const responseContent = completion.choices[0].message.content || '{}';
      logger.info('[AI Learn] GPT response received, length:', responseContent.length);

      const outlineData = JSON.parse(responseContent);
      const topics = Array.isArray(outlineData) ? outlineData : outlineData.topics || [];

      if (!topics.length) {
        console.error('[AI Learn] No topics generated');
        sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to generate topics' } });
        res.end();
        return;
      }

      logger.info('[AI Learn] Generated topics:', topics.length);

      // Stream topics one by one
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        // Ensure proper ID format
        topic.id = topic.id || `topic-${i + 1}`;

        // Ensure subtopics have proper IDs
        if (topic.subtopics) {
          topic.subtopics = topic.subtopics.map((st: { id?: string; type: string; [key: string]: unknown }) => ({
            ...st,
            id: st.id || `${st.type}-${i + 1}`,
          }));
        }

        sendSSE(res, 'message', { type: 'topic', data: topic });
        // Small delay to simulate progressive loading
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Send completion event
      sendSSE(res, 'message', { type: 'complete' });
      res.end();
    } catch (error) {
      console.error('[AI Learn] Error generating outline:', error);
      sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to generate outline' } });
      res.end();
    }
  }
);

// Note: Outline generation is now handled by the dedicated learnOutlineRoute
// This removes the conflicting /outline/:fileId endpoint

// Stream personalized content for a topic/subtopic
router.post(
  '/explain/stream',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId, topicId, subtopic, mode } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    logger.info('[AI Learn] Explain stream request:', { fileId, topicId, subtopic, mode, userId });

    if (!fileId || !topicId) {
      res
        .status(400)
        .json({ error: 'Missing required parameters: fileId and topicId are required' });
      return;
    }

    try {
      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

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

      // Get user persona from the proper personas table
      const { data: persona } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .single();

      logger.info('[AI Learn] User persona:', {
        userId,
        hasPersona: !!persona,
      });

      if (!persona) {
        sendSSE(res, 'message', {
          type: 'error',
          data: { message: 'User persona not found. Please complete onboarding.' },
        });
        res.end();
        return;
      }

      // Transform database persona to UserPersona format
      const transformedPersona = {
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
      };

      logger.info('[AI Learn] Transformed persona:', {
        primaryInterests: transformedPersona.primaryInterests,
        secondaryInterests: transformedPersona.secondaryInterests,
        currentRole: transformedPersona.currentRole,
        industry: transformedPersona.industry,
      });

      // Convert chunks to the format expected by our orchestrator
      const chunks =
        file.chunks?.slice(0, 10).map((c: FileChunk) => ({
          id: c.id,
          content: c.content,
          metadata: {
            chunkIndex: c.chunk_index,
            contentType: c.content_type || 'text',
            importance: c.importance || 'medium',
          },
          score: 1.0,
        })) || [];

      logger.info(`[AI Learn] Using StreamingExplanationService for ${mode} mode...`);

      // Use our StreamingExplanationService based on mode
      if (mode === 'explain' || !mode) {
        // Use deep explanation streaming
        const generator = streamingExplanationService.generateDeepExplanation({
          chunks,
          topic: topicId,
          subtopic,
          persona: transformedPersona,
          stream: true,
          model: 'gpt-4o',
        });

        // Stream chunks to client using proper SSE format
        for await (const chunk of generator) {
          sendSSE(res, 'message', { type: 'content', data: chunk });
        }
      } else if (mode === 'summary') {
        // Use progressive explanation for summary mode
        const content = chunks.map((c: { content: string }) => c.content).join('\n\n');
        const result = await streamingExplanationService.generateProgressiveExplanation(
          topicId || 'Summary',
          content,
          transformedPersona,
          'foundation'
        );

        sendSSE(res, 'message', { type: 'content', data: result.content });
      } else if (mode === 'flashcards') {
        // Use progressive explanation for flashcards mode
        const content = chunks.map((c: { content: string }) => c.content).join('\n\n');
        const result = await streamingExplanationService.generateProgressiveExplanation(
          topicId || 'Flashcards',
          content,
          transformedPersona,
          'intermediate'
        );

        // Format as flashcards HTML
        let flashcardHtml = '<h2>Flashcards</h2>';
        flashcardHtml += `<div style="border: 1px solid #ddd; padding: 16px; margin: 8px 0; border-radius: 8px;">`;
        flashcardHtml += result.content;
        flashcardHtml += `</div>`;

        sendSSE(res, 'message', { type: 'content', data: flashcardHtml });
      } else if (mode === 'quiz') {
        // Use progressive explanation for quiz mode
        const content = chunks.map((c: { content: string }) => c.content).join('\n\n');
        const result = await streamingExplanationService.generateProgressiveExplanation(
          topicId || 'Quiz',
          content,
          transformedPersona,
          'advanced'
        );

        // Format as quiz HTML
        let quizHtml = '<h2>Quiz Questions</h2>';
        quizHtml += `<div style="margin-bottom: 24px;">`;
        quizHtml += result.content;
        quizHtml += `</div>`;

        sendSSE(res, 'message', { type: 'content', data: quizHtml });
      } else {
        // Fallback to basic explanation
        const generator = streamingExplanationService.generateDeepExplanation({
          chunks,
          topic: topicId,
          subtopic,
          persona: transformedPersona,
          stream: true,
          model: 'gpt-4o',
        });

        for await (const chunk of generator) {
          sendSSE(res, 'message', { type: 'content', data: chunk });
        }
      }

      // Send completion signal
      sendSSE(res, 'message', { type: 'complete' });
      res.end();
    } catch (error) {
      console.error('[AI Learn] Error streaming content:', error);
      sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to stream content' } });
      res.end();
    }
  }
);

// Save user feedback
router.post('/feedback', authenticateUser, async (req: Request, res: Response) => {
  const { contentId, reaction, note } = req.body;
  const userId = (req as AuthenticatedRequest).user.id;

  try {
    // Store feedback in a simple table (you can create a proper table later)
    const { error } = await supabase.from('learning_feedback').insert({
      user_id: userId,
      content_id: contentId,
      reaction,
      note,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // If table doesn't exist, just log it
      logger.info('[AI Learn] Learning Feedback:', {
        userId,
        contentId,
        reaction,
        note,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[AI Learn] Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Chat endpoint removed - use the new orchestrator system via /explain/stream instead

// Regenerate content with feedback
router.post('/regenerate', authenticateUser, async (_req: Request, res: Response) => {
  // This would trigger a new content generation with the feedback incorporated
  res.json({ success: true, message: 'Content regeneration initiated' });
});

export default router;
