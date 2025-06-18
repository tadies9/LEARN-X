import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// Generate outline for a file (JSON response)
router.get('/:fileId', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { fileId } = req.params;
  const userId = (req as any).user.id;

  logger.info('[Learn Outline] Generate outline request:', { fileId, userId });

  if (!fileId) {
    res.status(400).json({ error: 'File ID is required' });
    return;
  }

  try {
    // Get file and its chunks
    const { data: file, error: fileError } = await supabase
      .from('course_files')
      .select('*, chunks:file_chunks(*)')
      .eq('id', fileId)
      .order('chunk_index', { foreignTable: 'file_chunks', ascending: true })
      .single();

    if (fileError || !file) {
      logger.error('[Learn Outline] File not found:', fileError);
      res.status(404).json({
        success: false,
        error: 'File not found',
      });
      return;
    }

    logger.info('[Learn Outline] File found:', {
      id: file.id,
      filename: file.filename,
      chunksCount: file.chunks?.length || 0,
    });

    // Check if chunks exist
    if (!file.chunks || file.chunks.length === 0) {
      logger.error('[Learn Outline] No chunks found for file:', fileId);
      res.status(400).json({
        success: false,
        error: 'File has not been processed yet. Please wait for file processing to complete.',
      });
      return;
    }

    const chunks = file.chunks.map((c: any) => c.content).join('\n\n');

    const topicPrompt = `Analyze this document and create a learning outline with 4-6 main topics.

Document content:
${chunks.substring(0, 8000)} // Limit for context window

For each topic, provide:
1. A clear, descriptive title
2. A brief summary
3. Key concepts to cover
4. Page range if mentioned in the content

Return a JSON object with a "sections" array containing objects with this structure:
{
  "sections": [{
    "id": "section-1",
    "title": "Topic Title Here",
    "summary": "Brief description of what this section covers",
    "topics": ["concept1", "concept2", "concept3"],
    "chunkIds": [],
    "chunkCount": 5,
    "startPage": 1,
    "endPage": 10
  }]
}`;

    logger.info('[Learn Outline] Generating outline with GPT-4o...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: topicPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content || '{}';
    logger.info('[Learn Outline] GPT response received');

    const outlineData = JSON.parse(responseContent);
    const sections = outlineData.sections || [];

    if (!sections.length) {
      logger.error('[Learn Outline] No sections generated');
      res.status(500).json({
        success: false,
        error: 'Failed to generate outline',
      });
      return;
    }

    // Format sections with proper IDs and default values
    const formattedSections = sections.map((section: any, i: number) => ({
      id: section.id || `section-${i + 1}`,
      title: section.title || `Section ${i + 1}`,
      summary: section.summary || '',
      topics: section.topics || [],
      chunkIds: [], // Will be populated later
      chunkCount: Math.floor(file.chunks.length / sections.length),
      startPage: section.startPage || i * 10 + 1,
      endPage: section.endPage || (i + 1) * 10,
    }));

    // Return JSON response
    res.json({
      fileId,
      sections: formattedSections,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error('[Learn Outline] Error generating outline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate outline',
    });
  }
});

export default router;
