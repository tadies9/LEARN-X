/**
 * Generate Routes
 * Handles batch content generation for personalized learning
 * Follows coding standards: < 100 lines, single responsibility
 */

import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';
import { GenerateController } from '../controllers/generate.controller';

const router = Router();
const controller = new GenerateController();

/**
 * Validation schema for generate request
 */
const generateSchema = z.object({
  file_ids: z.array(z.string().uuid()).min(1).max(10),
  output_types: z.array(z.enum(['flashcards', 'summary', 'quiz', 'outline'])),
  course_id: z.string().uuid(),
  options: z
    .object({
      flashcard_count: z.number().min(5).max(50).optional(),
      summary_length: z.enum(['brief', 'detailed']).optional(),
      quiz_difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    })
    .optional(),
});

/**
 * POST /api/generate
 * Generate personalized content for selected files
 */
router.post('/', authenticateUser, validateRequest(generateSchema), controller.generateContent);

/**
 * GET /api/generate/status/:jobId
 * Get the status of a generation job
 */
router.get('/status/:jobId', authenticateUser, controller.getJobStatus);

/**
 * GET /api/generate/history
 * Get user's generation history
 */
router.get('/history', authenticateUser, controller.getGenerationHistory);

export default router;
