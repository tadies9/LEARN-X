import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { FileService } from '../services/fileService';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { updateFileSchema } from '../validations/course.validation';
import multer from 'multer';

const router = Router();
const fileController = new FileController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only PDF, PPT, PPTX, DOC, DOCX, TXT, and MD files are allowed.'
        )
      );
    }
  },
});







// Job status tracking endpoints
router.get('/files/:id/processing-status', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // First verify user has access to the file
    const fileService = new FileService();
    await fileService.getFile(id, userId);

    // Get job status from job_tracking table
    const { supabase } = await import('../config/supabase');
    const { data: jobs, error } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('payload->>fileId', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      // Job status errors should be logged by the application's logging service
      return res.status(500).json({ error: 'Failed to fetch job status' });
    }

    const latestJob = jobs && jobs.length > 0 ? jobs[0] : null;

    return res.json({
      success: true,
      data: {
        fileId: id,
        status: latestJob?.status || 'no_job_found',
        jobId: latestJob?.id,
        attempts: latestJob?.attempts || 0,
        createdAt: latestJob?.created_at,
        errorMessage: latestJob?.error_message,
        metadata: latestJob?.metadata || {},
      },
    });
  } catch (error) {
    // Processing status errors should be logged by the application's logging service
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get processing status',
    });
  }
});

router.get('/queue/health', authenticateUser, async (_req, res) => {
  try {
    const { queueOrchestrator } = await import('../services/queue/QueueOrchestrator');
    const health = await queueOrchestrator.getSystemHealth();

    return res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    // Queue health errors should be logged by the application's logging service
    return res.status(500).json({
      error: 'Failed to fetch queue health',
    });
  }
});

// File routes (all require authentication)
// Note: Module files route is handled in module.routes.ts
router.get('/files/:id', authenticateUser, fileController.getFile);
router.post('/files/upload', authenticateUser, upload.single('file'), fileController.uploadFile);
router.put(
  '/files/:id',
  authenticateUser,
  validateRequest(updateFileSchema),
  fileController.updateFile
);
router.delete('/files/:id', authenticateUser, fileController.deleteFile);
router.put('/modules/:moduleId/files/reorder', authenticateUser, fileController.reorderFiles);
router.get('/files/:id/signed-url', authenticateUser, fileController.getSignedUrl);

export { router as fileRoutes };
