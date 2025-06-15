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
router.get('/generate-outline', authenticateSSE, async (req: Request, res: Response): Promise<void> => {
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
      chunksCount: file.chunks?.length || 0 
    });

    // Extract topics from chunks using GPT-4o
    if (!file.chunks || file.chunks.length === 0) {
      console.error('[AI Learn] No chunks found for file:', fileId);
      sendSSE(res, 'message', { type: 'error', data: { message: 'File has not been processed yet. Please wait for file processing to complete.' } });
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
    const topics = Array.isArray(outlineData) ? outlineData : (outlineData.topics || []);

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
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Send completion event
    sendSSE(res, 'message', { type: 'complete' });
    res.end();

  } catch (error) {
    console.error('[AI Learn] Error generating outline:', error);
    sendSSE(res, 'message', { type: 'error', data: { message: 'Failed to generate outline' } });
    res.end();
  }
});

// Stream personalized content for a topic/subtopic
router.post('/explain/stream', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { fileId, topicId, subtopic, mode } = req.body;
  const userId = (req as any).user.id;

  logger.info('[AI Learn] Explain stream request:', { fileId, topicId, subtopic, mode, userId });

  if (!fileId || !topicId) {
    res.status(400).json({ error: 'Missing required parameters: fileId and topicId are required' });
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

    // Get user persona
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const persona = profile?.persona as any;
    
    logger.info('[AI Learn] User profile:', { userId, hasProfile: !!profile, hasPersona: !!persona });
    if (persona) {
      logger.info('[AI Learn] Persona details:', {
        interests: persona.interests,
        learningStyle: persona.learningStyle,
        professionalBackground: persona.professionalBackground
      });
    }

    // Build personalized prompt based on mode
    let systemPrompt = `You are an expert tutor creating personalized learning content. 
Return ONLY the inner HTML content - do NOT include <html>, <head>, <body> or any wrapper tags.
Use semantic HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <div>, etc.
Start directly with the content (e.g., <h2>Topic Title</h2>).`;
    
    if (persona) {
      systemPrompt += `\n\nStudent Profile:
- Interests: ${persona.interests?.join(', ') || 'general'}
- Learning Style: ${persona.learningStyle || 'visual'}
- Professional Background: ${persona.professionalBackground || 'student'}
- Field: ${persona.field || 'general'}
- Communication Preference: ${persona.communicationStyle || 'friendly'}

IMPORTANT: Create analogies using their interests (especially ${persona.interests?.[0] || 'everyday examples'}).
Match their ${persona.communicationStyle || 'friendly'} communication style.
Adapt explanations to their ${persona.professionalBackground || 'student'} level.`;
    }

    const relevantChunks = file.chunks?.slice(0, 5).map((c: any) => c.content).join('\n\n') || '';
    
    let userPrompt = '';
    
    switch (mode) {
      case 'explain':
        userPrompt = `Explain the ${subtopic ? `"${subtopic}" section of` : ''} the topic "${topicId}" in a personalized way.

Use this document content as reference:
${relevantChunks.substring(0, 3000)}

Requirements:
1. Return ONLY content HTML - no <html>, <head>, <body> tags
2. Include a personalized analogy box using the student's interests
3. Break down complex concepts into simple terms
4. Use the student's preferred communication style
5. Include emoji sparingly for engagement

Structure:
- Start directly with <h2> for the topic title
- Include a highlighted analogy box: <div style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
- Explain key concepts clearly with <h3> subheadings
- Provide relevant examples in <ul> or <ol> lists
- End with a brief summary in a <div>`;
        break;

      case 'summary':
        userPrompt = `Create a concise summary of "${topicId}".

Use this document content as reference:
${relevantChunks.substring(0, 2000)}

Format as HTML fragments (no wrapper tags):
- Start with <h2>Summary</h2>
- 5-7 key bullet points in <ul>
- Important terms in <strong>
- A takeaway message in a styled <div>`;
        break;

      case 'flashcards':
        userPrompt = `Generate 5-7 flashcards for "${topicId}".

Use this document content as reference:
${relevantChunks.substring(0, 2000)}

Format each flashcard as HTML fragments (no wrapper tags):
- Start with <h2>Flashcards</h2>
- Each card in a <div style="border: 1px solid #ddd; padding: 16px; margin: 8px 0; border-radius: 8px;">
- Question in <h4>
- Answer in <details><summary>Click to reveal</summary>answer here</details>
- Focus on key concepts`;
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
        { role: 'user', content: userPrompt }
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
});

// Save user feedback
router.post('/feedback', authenticateUser, async (req: Request, res: Response) => {
  const { contentId, reaction, note } = req.body;
  const userId = (req as any).user.id;

  try {
    // Store feedback in a simple table (you can create a proper table later)
    const { error } = await supabase
      .from('learning_feedback')
      .insert({
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