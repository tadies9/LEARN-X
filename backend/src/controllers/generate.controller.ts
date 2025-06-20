/**
 * Generate Controller
 * Handles content generation requests
 * Follows coding standards: < 200 lines, single responsibility
 */

import { Request, Response } from 'express';
import { GenerateService } from '../services/generate.service';
import { logger } from '../utils/logger';

export class GenerateController {
  private generateService: GenerateService;

  constructor() {
    this.generateService = new GenerateService();
  }

  /**
   * Generate personalized content for selected files
   */
  generateContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { file_ids, output_types, course_id, persona_id, options } = req.body;

      logger.info('[GenerateController] Starting content generation', {
        userId,
        fileCount: file_ids.length,
        outputTypes: output_types,
      });

      // Create generation job
      const job = await this.generateService.createGenerationJob({
        userId,
        fileIds: file_ids,
        outputTypes: output_types,
        courseId: course_id,
        personaId: persona_id,
        options: options || {},
      });

      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          estimatedTime: this.calculateEstimatedTime(file_ids.length, output_types.length),
          message: 'Content generation started. Use the job ID to track progress.',
        },
      });
    } catch (error) {
      logger.error('[GenerateController] Generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start content generation',
      });
    }
  };

  /**
   * Get the status of a generation job
   */
  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;
      const userId = req.user!.id;

      const status = await this.generateService.getJobStatus(jobId, userId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('[GenerateController] Status check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
      });
    }
  };

  /**
   * Get user's generation history
   */
  getGenerationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { limit = 10, offset = 0 } = req.query;

      const history = await this.generateService.getUserHistory(
        userId,
        Number(limit),
        Number(offset)
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('[GenerateController] History fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get generation history',
      });
    }
  };

  /**
   * Calculate estimated time based on files and output types
   */
  private calculateEstimatedTime(fileCount: number, outputTypeCount: number): number {
    // Base time: 5 seconds per file per output type
    const baseTime = 5;
    // Add overhead for processing
    const overhead = 3;

    return fileCount * outputTypeCount * baseTime + overhead;
  }
}
