import { Router } from 'express';
import { FileController } from '../controllers/fileController';
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

// Test endpoint for signed URL (bypasses auth)
router.get('/files/:id/test-signed-url', async (req, res) => {
  try {
    console.log('=== Test signed URL endpoint ===');
    const { id } = req.params;
    const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded user ID for testing
    
    const fileService = new (require('../services/fileService').FileService)();
    const url = await fileService.getSignedUrl(id, userId, 3600);
    
    res.json({ url, message: 'Test endpoint - signed URL generated' });
  } catch (error) {
    console.error('Test signed URL error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Temporary: Make signed URL endpoint public for testing
router.get('/files/:id/signed-url-public', async (req, res) => {
  try {
    console.log('=== Public signed URL endpoint ===');
    const { id } = req.params;
    const { expiresIn = 3600 } = req.query;
    const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded user ID for testing
    
    const fileService = new (require('../services/fileService').FileService)();
    const url = await fileService.getSignedUrl(id, userId, Number(expiresIn));
    
    res.json({ url });
  } catch (error) {
    console.error('Public signed URL error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Apply auth middleware to all routes
router.use(authenticateUser);

// Test endpoint
router.post('/files/test-upload', (req, res) => {
  console.log('Test upload endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.json({ message: 'Test endpoint working' });
});

// File routes
router.get('/modules/:moduleId/files', fileController.getModuleFiles);
router.get('/files/:id', fileController.getFile);
router.post('/files/upload', upload.single('file'), fileController.uploadFile);
router.put('/files/:id', validateRequest(updateFileSchema), fileController.updateFile);
router.delete('/files/:id', fileController.deleteFile);
router.put('/modules/:moduleId/files/reorder', fileController.reorderFiles);
router.get('/files/:id/signed-url', fileController.getSignedUrl);

export { router as fileRoutes };
