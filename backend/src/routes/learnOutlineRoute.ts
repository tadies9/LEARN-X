import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { pythonOutlineService } from '../services/ai/PythonOutlineService';

const router = Router();

// Generate outline for a file (JSON response)
router.get('/:fileId', authenticateUser, aiRateLimiter, async (req: Request, res: Response): Promise<void> => {
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

    logger.info('[Learn Outline] Generating outline with Python AI service...');

    // Use Python AI service for outline generation
    const outlineResult = await pythonOutlineService.generateOutline({
      content: chunks,
      filename: file.filename,
      sectionCount: 5,
      includePageNumbers: true,
      difficulty: 'intermediate',
      userId
    });

    if (!outlineResult.sections.length) {
      logger.error('[Learn Outline] No sections generated');
      res.status(500).json({
        success: false,
        error: 'Failed to generate outline',
      });
      return;
    }

    // Format sections with chunk distribution
    const formattedSections = outlineResult.sections.map((section, _i) => ({
      ...section,
      chunkIds: [], // Will be populated later if needed
      chunkCount: Math.floor(file.chunks.length / outlineResult.sections.length)
    }));

    // Return JSON response
    res.json({
      fileId,
      sections: formattedSections,
      generatedAt: outlineResult.generatedAt,
      processingTime: outlineResult.processingTime,
      tokensUsed: outlineResult.tokensUsed
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
