import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authenticateUser } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All AI routes require authentication
router.use(authenticateUser);

// Apply AI-specific rate limiting
router.use(aiRateLimiter);

// Content Generation
router.post('/explain', aiController.streamExplanation);
router.post('/summarize', aiController.generateSummary);
router.post('/flashcards', aiController.generateFlashcards);
router.post('/quiz', aiController.generateQuiz);

// Outline & Chat
router.get('/outline/:fileId', aiController.generateOutline);
router.post('/chat', aiController.streamChat);

// Search
router.get('/search', aiController.search);

// Feedback
router.post('/feedback', aiController.submitFeedback);

// Analytics
router.get('/costs', aiController.getCosts);
router.get('/usage', aiController.getUsage);

export default router;
