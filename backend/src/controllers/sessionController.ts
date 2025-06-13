import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// Validation schemas
const sessionSchema = z.object({
  fileId: z.string().uuid(),
  duration: z.number().min(0),
  lastPosition: z.object({
    page: z.number().min(1),
    scroll: z.number().min(0),
  }).optional(),
  progress: z.object({
    completedSections: z.array(z.string()),
    viewedPages: z.array(z.number()),
    totalTime: z.number(),
  }),
});

const annotationSchema = z.object({
  fileId: z.string().uuid(),
  chunkId: z.string().uuid().optional(),
  text: z.string().min(1),
  note: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#FFFF00'),
  position: z.object({
    page: z.number(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

const progressSchema = z.object({
  fileId: z.string().uuid(),
  completedChunks: z.array(z.string().uuid()),
  totalTime: z.number(),
  lastPosition: z.object({
    page: z.number(),
    scroll: z.number(),
  }).optional(),
  stats: z.object({
    questionsAsked: z.number(),
    flashcardsCreated: z.number(),
    notesWritten: z.number(),
  }).optional(),
});

class SessionController {
  async getLatestSession(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const userId = (req as any).user.id;

      const { data: session, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve session.',
      });
    }
  }

  async saveSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionData = sessionSchema.parse(req.body);
      const userId = (req as any).user.id;

      // End any active sessions
      await supabase
        .from('study_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('file_id', sessionData.fileId)
        .is('ended_at', null);

      // Create new session
      const { data: session, error } = await supabase
        .from('study_sessions')
        .upsert({
          user_id: userId,
          file_id: sessionData.fileId,
          duration: sessionData.duration,
          progress: sessionData.progress,
          last_position: sessionData.lastPosition,
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error('Save session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save session.',
      });
    }
  }

  async updateProgress(req: Request, res: Response): Promise<void> {
    try {
      const progressData = progressSchema.parse(req.body);
      const userId = (req as any).user.id;

      const { data: progress, error } = await supabase
        .from('study_progress')
        .upsert({
          user_id: userId,
          file_id: progressData.fileId,
          completed_chunks: progressData.completedChunks,
          total_time: progressData.totalTime,
          last_position: progressData.lastPosition,
          stats: progressData.stats,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      logger.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update progress.',
      });
    }
  }

  async getAnnotations(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const userId = (req as any).user.id;

      const { data: annotations, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: annotations,
      });
    } catch (error) {
      logger.error('Get annotations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve annotations.',
      });
    }
  }

  async createAnnotation(req: Request, res: Response): Promise<void> {
    try {
      const annotationData = annotationSchema.parse(req.body);
      const userId = (req as any).user.id;

      const { data: annotation, error } = await supabase
        .from('annotations')
        .insert({
          user_id: userId,
          ...annotationData,
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: annotation,
      });
    } catch (error) {
      logger.error('Create annotation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create annotation.',
      });
    }
  }

  async updateAnnotation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = annotationSchema.partial().parse(req.body);
      const userId = (req as any).user.id;

      const { data: annotation, error } = await supabase
        .from('annotations')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user owns the annotation
        .select()
        .single();

      if (error) throw error;

      if (!annotation) {
        res.status(404).json({
          success: false,
          error: 'Annotation not found.',
        });
        return;
      }

      res.json({
        success: true,
        data: annotation,
      });
    } catch (error) {
      logger.error('Update annotation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update annotation.',
      });
    }
  }

  async deleteAnnotation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure user owns the annotation

      if (error) throw error;

      res.json({
        success: true,
        message: 'Annotation deleted successfully.',
      });
    } catch (error) {
      logger.error('Delete annotation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete annotation.',
      });
    }
  }
}

export const sessionController = new SessionController();