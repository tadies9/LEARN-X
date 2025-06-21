/**
 * Generate Service
 * Handles content generation logic and job management
 * Follows coding standards: < 300 lines, single responsibility
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { FileProcessingQueue } from './queue/FileProcessingQueue';
import { logger } from '../utils/logger';
import type { GenerationResult, GenerationResultData } from '../types/database.types';

interface GenerationJobData {
  userId: string;
  fileIds: string[];
  outputTypes: string[];
  courseId: string;
  personaId?: string;
  options: Record<string, unknown>;
}

interface GenerationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: GenerationResultData;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GenerateService {
  private fileQueue: FileProcessingQueue;

  constructor() {
    this.fileQueue = new FileProcessingQueue();
  }

  /**
   * Create a new generation job
   */
  async createGenerationJob(data: GenerationJobData): Promise<GenerationJob> {
    const jobId = uuidv4();

    try {
      // Store job in database
      const { error: insertError } = await supabase.from('generation_jobs').insert({
        id: jobId,
        user_id: data.userId,
        course_id: data.courseId,
        file_ids: data.fileIds,
        output_types: data.outputTypes,
        persona_id: data.personaId,
        options: data.options,
        status: 'pending',
        progress: 0,
      });

      if (insertError) throw insertError;

      // Queue the job for processing
      await this.queueGenerationTasks(jobId, data);

      return {
        id: jobId,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('[GenerateService] Failed to create job:', error);
      throw new Error('Failed to create generation job');
    }
  }

  /**
   * Queue individual tasks for each file/output combination
   */
  private async queueGenerationTasks(jobId: string, data: GenerationJobData): Promise<void> {
    const tasks = [];

    // Create a task for each file/output combination
    for (const fileId of data.fileIds) {
      for (const outputType of data.outputTypes) {
        tasks.push({
          jobId,
          fileId,
          outputType,
          userId: data.userId,
          courseId: data.courseId,
          personaId: data.personaId,
          options: data.options,
        });
      }
    }

    // Send tasks to Python AI service via PGMQ
    await this.fileQueue.addGenerationTasks(tasks);
  }

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string, userId: string): Promise<GenerationJob | null> {
    try {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      // Check for completed tasks
      const { data: completedTasks } = await supabase
        .from('generation_results')
        .select('*')
        .eq('job_id', jobId);

      // Calculate progress
      const totalTasks = data.file_ids.length * data.output_types.length;
      const completedCount = completedTasks?.length || 0;
      const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

      // Update status if all tasks are complete
      let status = data.status;
      if (completedCount === totalTasks && status !== 'completed') {
        status = 'completed';
        await this.updateJobStatus(jobId, status, 100);
      }

      return {
        id: data.id,
        status,
        progress,
        results: this.formatResults(completedTasks || []),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      logger.error('[GenerateService] Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: string, progress: number): Promise<void> {
    await supabase
      .from('generation_jobs')
      .update({ status, progress, updated_at: new Date() })
      .eq('id', jobId);
  }

  /**
   * Format results for API response
   */
  private formatResults(tasks: GenerationResult[]): GenerationResultData {
    const results: GenerationResultData = {
      flashcards: [],
      summary: undefined,
      questions: [],
      outline: [],
    };

    for (const task of tasks) {
      if (task.output_type === 'flashcards' && task.result?.flashcards) {
        results.flashcards = [...(results.flashcards || []), ...task.result.flashcards];
      } else if (task.output_type === 'summary' && task.result?.summary) {
        // For multiple summaries, concatenate them
        results.summary = results.summary 
          ? `${results.summary}\n\n${task.result.summary}` 
          : task.result.summary;
      } else if (task.output_type === 'quiz' && task.result?.questions) {
        results.questions = [...(results.questions || []), ...task.result.questions];
      } else if (task.output_type === 'outline' && task.result?.outline) {
        results.outline = [...(results.outline || []), ...task.result.outline];
      }
    }

    return results;
  }

  /**
   * Get user's generation history
   */
  async getUserHistory(userId: string, limit: number, offset: number): Promise<GenerationJob[]> {
    try {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('[GenerateService] Failed to get user history:', error);
      return [];
    }
  }
}
