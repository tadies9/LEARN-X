import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const saveContentSchema = z.object({
  fileId: z.string().uuid(),
  topicId: z.string(),
  subtopic: z.string().optional(),
  content: z.string(),
  mode: z.string(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateSavedContentSchema = z.object({
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Save content
router.post('/save', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = saveContentSchema.parse(req.body);

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_content')
      .select('id')
      .eq('user_id', userId)
      .eq('file_id', data.fileId)
      .eq('topic_id', data.topicId)
      .eq('subtopic', data.subtopic || '')
      .eq('mode', data.mode)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('saved_content')
        .update({
          content: data.content,
          tags: data.tags || [],
          notes: data.notes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        logger.error('Error updating saved content:', error);
        res.status(500).json({ error: 'Failed to update saved content' });
        return;
      }

      res.json({ success: true, message: 'Content updated' });
    } else {
      // Create new
      const { error } = await supabase
        .from('saved_content')
        .insert({
          user_id: userId,
          file_id: data.fileId,
          topic_id: data.topicId,
          subtopic: data.subtopic || '',
          content: data.content,
          mode: data.mode,
          tags: data.tags || [],
          notes: data.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        logger.error('Error saving content:', error);
        res.status(500).json({ error: 'Failed to save content' });
        return;
      }

      res.json({ success: true, message: 'Content saved' });
    }
  } catch (error) {
    logger.error('Save content error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Get saved content
router.get('/list', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { fileId, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('saved_content')
      .select(`
        *,
        course_files!inner(
          id,
          filename,
          course_id,
          courses!inner(
            id,
            title
          )
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (fileId) {
      query = query.eq('file_id', fileId as string);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching saved content:', error);
      res.status(500).json({ error: 'Failed to fetch saved content' });
      return;
    }

    res.json({
      success: true,
      data: {
        items: data || [],
        total: count || 0,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('List saved content error:', error);
    res.status(500).json({ error: 'Failed to list saved content' });
  }
});

// Get specific saved content
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('saved_content')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Saved content not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Get saved content error:', error);
    res.status(500).json({ error: 'Failed to get saved content' });
  }
});

// Update saved content (tags/notes)
router.patch('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const updates = updateSavedContentSchema.parse(req.body);

    const { error } = await supabase
      .from('saved_content')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error updating saved content:', error);
      res.status(500).json({ error: 'Failed to update saved content' });
      return;
    }

    res.json({ success: true, message: 'Content updated' });
  } catch (error) {
    logger.error('Update saved content error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Delete saved content
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('saved_content')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting saved content:', error);
      res.status(500).json({ error: 'Failed to delete saved content' });
      return;
    }

    res.json({ success: true, message: 'Content deleted' });
  } catch (error) {
    logger.error('Delete saved content error:', error);
    res.status(500).json({ error: 'Failed to delete saved content' });
  }
});

export default router;