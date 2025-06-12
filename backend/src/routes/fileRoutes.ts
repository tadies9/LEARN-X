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
    fileSize: 50 * 1024 * 1024, // 50MB limit
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

// Apply auth middleware to all routes
router.use(authenticateUser);

// File routes
router.get('/modules/:moduleId/files', fileController.getModuleFiles);
router.get('/files/:id', fileController.getFile);
router.post('/files/upload', upload.single('file'), fileController.uploadFile);
router.put('/files/:id', validateRequest(updateFileSchema), fileController.updateFile);
router.delete('/files/:id', fileController.deleteFile);
router.put('/modules/:moduleId/files/reorder', fileController.reorderFiles);
router.get('/files/:id/signed-url', fileController.getSignedUrl);

export { router as fileRoutes };
