import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { authenticateSSE } from '../middleware/sseAuth';
import { supabase } from '../config/supabase';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// SSE helper to send events
const sendSSE = (res: Response, event: string, data: any) => {
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
    const userId = (req as any).user.id;

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

      const chunks = file.chunks.map((c: any) => c.content).join('\n\n');

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
          topic.subtopics = topic.subtopics.map((st: any) => ({
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

// Stream personalized content for a topic/subtopic
router.post(
  '/explain/stream',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId, topicId, subtopic, mode } = req.body;
    const userId = (req as any).user.id;

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

      // Build personalized prompt based on mode
      let systemPrompt = `You are an expert tutor creating personalized learning content. 
Return ONLY the inner HTML content - do NOT include <html>, <head>, <body> or any wrapper tags.
Use semantic HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <div>, etc.
Start directly with the content (e.g., <h2>Topic Title</h2>).

PERSONALIZATION APPROACH:
- Weave analogies and examples NATURALLY throughout the content
- Choose the most relevant interest/context for each concept
- NEVER announce "Here's an analogy" or use special styling boxes
- Make personalization feel discovered, not forced`;

      if (persona) {
        const interests = [
          ...(persona.personal_interests?.primary || []),
          ...(persona.personal_interests?.secondary || []),
        ];

        systemPrompt += `\n\nStudent Profile:
- Primary Interests: ${persona.personal_interests?.primary?.join(', ') || 'general'}
- Secondary Interests: ${persona.personal_interests?.secondary?.join(', ') || 'none'}
- Learning Topics: ${persona.personal_interests?.learningTopics?.join(', ') || 'general'}
- Professional Role: ${persona.professional_context?.role || 'student'}
- Industry: ${persona.professional_context?.industry || 'general'}
- Technical Level: ${persona.professional_context?.technicalLevel || 'beginner'}
- Learning Style: ${persona.learning_style?.primary || 'visual'}
- Communication Style: ${persona.communication_tone?.style || 'friendly'}

SMART PERSONALIZATION:
You have access to ALL their interests: ${interests.join(', ')}
For each concept, intelligently choose which interest/context works best for analogies.
Integrate examples naturally using their professional context (${persona.professional_context?.industry || 'general'}).
Adapt complexity to their ${persona.professional_context?.technicalLevel || 'beginner'} level.`;
      }

      const relevantChunks =
        file.chunks
          ?.slice(0, 5)
          .map((c: any) => c.content)
          .join('\n\n') || '';

      let userPrompt = '';

      switch (mode) {
        case 'explain':
          userPrompt = `Explain the ${subtopic ? `"${subtopic}" section of` : ''} the topic "${topicId}" in a personalized way.

Use this document content as reference:
${relevantChunks.substring(0, 3000)}

Requirements:
1. Return ONLY content HTML - no <html>, <head>, <body> tags
2. Naturally weave analogies and examples throughout using their interests
3. Break down complex concepts into simple terms
4. Use their preferred communication style
5. Include emoji sparingly for engagement

Structure:
- Start directly with <h2> for the topic title
- Naturally integrate analogies within explanations (NO special boxes)
- Explain key concepts clearly with <h3> subheadings
- Provide relevant examples in <ul> or <ol> lists using their interests/context
- End with a brief summary connecting to their goals

REMEMBER: Choose the most relevant interest for each concept. Make personalization feel natural and discovered.`;
          break;

        case 'summary':
          userPrompt = `Create a concise summary of "${topicId}" that connects to their interests and goals.

Use this document content as reference:
${relevantChunks.substring(0, 2000)}

Format as HTML fragments (no wrapper tags):
- Start with <h2>Summary</h2>
- 5-7 key bullet points in <ul> with natural examples from their context
- Important terms in <strong>
- A takeaway message connecting to their professional goals

PERSONALIZATION: Naturally reference their interests/industry when explaining key points.`;
          break;

        case 'flashcards':
          userPrompt = `Generate 5-7 flashcards for "${topicId}" using examples from their interests and context.

Use this document content as reference:
${relevantChunks.substring(0, 2000)}

Format each flashcard as HTML fragments (no wrapper tags):
- Start with <h2>Flashcards</h2>
- Each card in a <div style="border: 1px solid #ddd; padding: 16px; margin: 8px 0; border-radius: 8px;">
- Question in <h4> using scenarios from their interests/industry
- Answer in <details><summary>Click to reveal</summary>answer here</details>
- Focus on key concepts with natural examples from their context

PERSONALIZATION: Frame questions using familiar scenarios from their interests/professional context.`;
          break;

        case 'quiz':
          userPrompt = `Create 3 quiz questions about "${topicId}".

Use this document content as reference:
${relevantChunks.substring(0, 2000)}

Format as HTML fragments (no wrapper tags):
- Start with <h2>Quiz Questions</h2>
- Each question in a <div style="margin-bottom: 24px;">
- Question text in <h4>
- Options in <ol type="A">
- Show correct answer clearly marked
- Include brief explanation`;
          break;

        case 'chat':
          userPrompt = `You are ready to answer questions about "${topicId}".
Briefly introduce the topic and invite questions.
Keep it conversational and encouraging.`;
          break;

        default:
          userPrompt = `Explain "${topicId}" - ${subtopic} based on the document content.`;
      }

      logger.info(`[AI Learn] Streaming ${mode} content with GPT-4o...`);

      // Stream response from GPT-4o
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 2000,
      });

      // Stream chunks to client using proper SSE format
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          sendSSE(res, 'message', { type: 'content', data: content });
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
  const userId = (req as any).user.id;

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

// Regenerate content with feedback
router.post('/regenerate', authenticateUser, async (_req: Request, res: Response) => {
  // This would trigger a new content generation with the feedback incorporated
  res.json({ success: true, message: 'Content regeneration initiated' });
});

export default router;
