import { Router } from 'express';
import { sessionController } from '../controllers/sessionController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// All session routes require authentication
router.use(authenticateUser);

// Session management
router.get('/:fileId/latest', sessionController.getLatestSession);
router.post('/save', sessionController.saveSession);
router.post('/progress', sessionController.updateProgress);

// Annotations
router.get('/annotations/:fileId', sessionController.getAnnotations);
router.post('/annotations', sessionController.createAnnotation);
router.put('/annotations/:id', sessionController.updateAnnotation);
router.delete('/annotations/:id', sessionController.deleteAnnotation);

export default router;