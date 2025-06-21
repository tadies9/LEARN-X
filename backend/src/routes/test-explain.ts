import { Router } from 'express';
import { pythonAIClient } from '../services/ai/PythonAIClient';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import type { Persona } from '../types/persona.types';
import type { FileChunk } from '../types/database.types';

const router = Router();

// Test explain endpoint without auth
router.post('/test-explain', async (req, res) => {
  const { fileId } = req.body;

  logger.info('[Test Explain] Request received:', { fileId });

  try {
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');

    if (res.flushHeaders) res.flushHeaders();

    // Get file and chunks
    const { data: file, error: fileError } = await supabase
      .from('course_files')
      .select('*, chunks:file_chunks(*)')
      .eq('id', fileId || '9c908e3b-a832-45cc-8b8c-baa1d93600ec')
      .order('chunk_index', { foreignTable: 'file_chunks', ascending: true })
      .single();

    if (fileError || !file) {
      res.write('event: message\n');
      res.write(`data: {"type":"error","data":"File not found: ${fileError?.message}"}\n\n`);
      res.end();
      return;
    }

    logger.info('[Test Explain] File found:', {
      fileId: file.id,
      name: file.name,
      chunkCount: file.chunks?.length || 0,
    });

    // Get first few chunks
    const chunks =
      file.chunks
        ?.slice(0, 5)
        .map((c: FileChunk) => c.content)
        .join('\n\n') || '';
    const content = chunks.substring(0, 4000);

    logger.info('[Test Explain] Content length:', content.length);

    // Send initial message
    res.write('event: message\n');
    res.write(
      `data: {"type":"info","data":"File: ${file.name}, Chunks: ${file.chunks?.length || 0}"}\n\n`
    );

    // Test persona with all 5 dimensions for PersonaPromptBuilder
    const testPersona: Persona = {
      id: 'test',
      user_id: 'test-user',
      professional_context: {
        role: 'Software Developer',
        industry: 'Technology',
        technicalLevel: 'intermediate',
        careerAspirations: 'Become a Machine Learning Engineer',
      },
      personal_interests: {
        primary: ['technology', 'artificial intelligence', 'gaming'],
        secondary: ['business', 'startups'],
        learningTopics: ['machine learning', 'data science', 'cloud computing'],
      },
      learning_style: {
        primary: 'visual',
        secondary: 'kinesthetic',
        preferenceStrength: 0.8,
      },
      content_preferences: {
        density: 'moderate',
        examplesPerConcept: 2,
        detailTolerance: 'medium',
        repetitionPreference: 'low',
      },
      communication_tone: {
        style: 'friendly',
        technicalComfort: 7,
        encouragementLevel: 'moderate',
        humorAppropriate: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generate content using Python AI
    logger.info('[Test Explain] Calling Python AI service...');

    const generator = pythonAIClient.generateContent({
      content,
      content_type: 'explanation',
      topic: file.name,
      difficulty: 'intermediate',
      persona: testPersona,
      model: 'gpt-4o',
      temperature: 0.7,
      stream: true,
      user_id: 'test-user',
    });

    let totalContent = '';

    // Stream the response
    for await (const chunk of generator) {
      if (chunk.error) {
        logger.error('[Test Explain] Error:', chunk.error);
        res.write('event: message\n');
        res.write(`data: {"type":"error","data":"${chunk.error}"}\n\n`);
        res.end();
        return;
      }

      if (chunk.content) {
        totalContent += chunk.content;
        res.write('event: message\n');
        res.write(`data: {"type":"content","data":${JSON.stringify(chunk.content)}}\n\n`);

        // @ts-expect-error - flush might not be in types
        if (res.flush) res.flush();
      }

      if (chunk.done) {
        logger.info('[Test Explain] Generation complete, total length:', totalContent.length);
        res.write('event: message\n');
        res.write('data: {"type":"complete","data":"Done"}\n\n');
        res.end();
        return;
      }
    }
  } catch (error) {
    logger.error('[Test Explain] Error:', error);
    res.write('event: message\n');
    res.write(
      `data: {"type":"error","data":"${error instanceof Error ? error.message : 'Unknown error'}"}\n\n`
    );
    res.end();
  }
});

// Test regenerate endpoint without auth
router.post('/test-explain/regenerate', async (req, res) => {
  const { fileId, topicId, feedback } = req.body;

  logger.info('[Test Regenerate] Request received:', { fileId, topicId, feedback });

  try {
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');

    if (res.flushHeaders) res.flushHeaders();

    // Send start message
    res.write('event: message\n');
    res.write(
      `data: {"type":"regeneration-start","data":{"message":"Regenerating with your feedback..."}}\n\n`
    );

    // Get file and chunks
    const { data: file, error: fileError } = await supabase
      .from('course_files')
      .select('*, chunks:file_chunks(*)')
      .eq('id', fileId || '9c908e3b-a832-45cc-8b8c-baa1d93600ec')
      .order('chunk_index', { foreignTable: 'file_chunks', ascending: true })
      .single();

    if (fileError || !file) {
      res.write('event: message\n');
      res.write(`data: {"type":"error","data":"File not found: ${fileError?.message}"}\n\n`);
      res.end();
      return;
    }

    // Get first few chunks and append feedback
    const chunks =
      file.chunks
        ?.slice(0, 5)
        .map((c: FileChunk) => c.content)
        .join('\n\n') || '';
    const contentWithFeedback = `${chunks.substring(0, 4000)}\n\nUser Feedback for Improvement: ${feedback}`;

    logger.info('[Test Regenerate] Content length with feedback:', contentWithFeedback.length);

    // Test persona with all 5 dimensions
    const testPersona: Persona = {
      id: 'test',
      user_id: 'test-user',
      professional_context: {
        role: 'Software Developer',
        industry: 'Technology',
        technicalLevel: 'intermediate',
        careerAspirations: 'Become a Machine Learning Engineer',
      },
      personal_interests: {
        primary: ['technology', 'artificial intelligence', 'gaming'],
        secondary: ['business', 'startups'],
        learningTopics: ['machine learning', 'data science', 'cloud computing'],
      },
      learning_style: {
        primary: 'visual',
        secondary: 'kinesthetic',
        preferenceStrength: 0.8,
      },
      content_preferences: {
        density: 'moderate',
        examplesPerConcept: 2,
        detailTolerance: 'medium',
        repetitionPreference: 'low',
      },
      communication_tone: {
        style: 'friendly',
        technicalComfort: 7,
        encouragementLevel: 'moderate',
        humorAppropriate: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generate improved content using Python AI
    logger.info('[Test Regenerate] Calling Python AI service with feedback...');

    const generator = pythonAIClient.generateContent({
      content: contentWithFeedback,
      content_type: 'explanation',
      topic: `${topicId} (Improved based on feedback)`,
      difficulty: 'intermediate',
      persona: testPersona,
      model: 'gpt-4o',
      temperature: 0.8, // Slightly higher for variation
      stream: true,
      user_id: 'test-user',
    });

    let totalContent = '';

    // Stream the response
    for await (const chunk of generator) {
      if (chunk.error) {
        logger.error('[Test Regenerate] Error:', chunk.error);
        res.write('event: message\n');
        res.write(`data: {"type":"error","data":"${chunk.error}"}\n\n`);
        res.end();
        return;
      }

      if (chunk.content) {
        totalContent += chunk.content;
        res.write('event: message\n');
        res.write(`data: {"type":"content","data":${JSON.stringify(chunk.content)}}\n\n`);

        // @ts-expect-error - flush might not be in types
        if (res.flush) res.flush();
      }

      if (chunk.done) {
        logger.info('[Test Regenerate] Generation complete, total length:', totalContent.length);
        res.write('event: message\n');
        res.write('data: {"type":"complete","data":{"regenerated":true}}\n\n');
        res.end();
        return;
      }
    }
  } catch (error) {
    logger.error('[Test Regenerate] Error:', error);
    res.write('event: message\n');
    res.write(
      `data: {"type":"error","data":"${error instanceof Error ? error.message : 'Unknown error'}"}\n\n`
    );
    res.end();
  }
});

export default router;
