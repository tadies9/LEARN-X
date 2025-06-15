/**
 * File Processor Service
 * Handles file processing jobs from the queue
 * Follows coding standards: Under 300 lines, single responsibility
 */

import { EnhancedFileProcessingService } from '../EnhancedFileProcessingService';
import { EmbeddingQueue } from '../queue/EmbeddingQueue';
import { NotificationQueue, createFileProcessingNotification } from '../queue/NotificationQueue';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { QueueJob } from '../queue/EnhancedPGMQClient';

export interface FileProcessingJob {
  fileId: string;
  userId: string;
  processingOptions?: {
    chunkSize?: number;
    priority?: 'low' | 'medium' | 'high';
    [key: string]: any;
  };
  queuedAt: string;
  retryCount?: number;
}

export class FileProcessor {
  private fileProcessingService: EnhancedFileProcessingService;
  private embeddingQueue: EmbeddingQueue;
  private notificationQueue: NotificationQueue;

  constructor() {
    this.fileProcessingService = new EnhancedFileProcessingService();
    this.embeddingQueue = new EmbeddingQueue();
    this.notificationQueue = new NotificationQueue();
  }

  /**
   * Processes a file processing job from the queue
   */
  async processJob(job: QueueJob<FileProcessingJob>): Promise<void> {
    const { fileId, userId, processingOptions } = job.message;
    
    logger.info(`[FileProcessor] Processing file: ${fileId}`, {
      msgId: job.msg_id.toString(),
      userId,
      attempt: job.read_ct,
      options: processingOptions
    });

    try {
      // Get file details with ownership verification
      const file = await this.getFileWithValidation(fileId, userId);
      
      // Update status to processing
      await this.updateFileStatus(fileId, 'processing', {
        processing_started_at: new Date().toISOString()
      });

      // Extract content with retry logic
      const extractedContent = await this.extractContentWithRetry(file);
      
      if (!extractedContent?.trim()) {
        throw new Error('No content could be extracted from file');
      }

      logger.info(`[FileProcessor] Content extracted: ${extractedContent.length} characters`);

      // Perform semantic chunking
      const chunks = await this.performSemanticChunking(
        extractedContent, 
        file.filename || file.original_name,
        processingOptions
      );

      logger.info(`[FileProcessor] Created ${chunks.length} semantic chunks`);

      // Save chunks with batch insertion
      const savedChunks = await this.saveChunksBatch(fileId, chunks);
      
      // Queue embeddings efficiently
      await this.embeddingQueue.enqueueBatch(
        fileId, 
        savedChunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          position: chunk.chunk_index,
          metadata: chunk.metadata || {}
        })),
        userId
      );

      // Update file status to completed
      await this.updateFileStatus(fileId, 'completed', {
        processed_at: new Date().toISOString(),
        chunk_count: savedChunks.length,
        processing_metadata: {
          contentLength: extractedContent.length,
          chunkingComplete: true,
          embeddingsQueued: true
        }
      });

      // Send success notification
      await this.notificationQueue.enqueue(
        createFileProcessingNotification(
          userId, 
          fileId, 
          file.filename || file.original_name, 
          true
        )
      );

      logger.info(`[FileProcessor] Successfully processed file ${fileId}`, {
        chunkCount: savedChunks.length,
        processingTimeMs: Date.now() - new Date(job.message.queuedAt).getTime()
      });

    } catch (error) {
      logger.error(`[FileProcessor] Failed to process file ${fileId}:`, error);
      
      // Update file status to failed
      await this.updateFileStatus(fileId, 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString()
      });

      // Send failure notification
      try {
        const file = await this.getFileWithValidation(fileId, userId);
        await this.notificationQueue.enqueue(
          createFileProcessingNotification(
            userId, 
            fileId, 
            file.filename || file.original_name, 
            false
          )
        );
      } catch (notificationError) {
        logger.error('[FileProcessor] Failed to send failure notification:', notificationError);
      }
      
      throw error;
    }
  }

  /**
   * Gets file details with ownership validation
   */
  private async getFileWithValidation(fileId: string, userId: string): Promise<any> {
    const { data: file, error: fileError } = await supabase
      .from('course_files')
      .select(`
        *,
        modules!inner(
          id,
          title,
          courses!inner(
            id,
            title,
            user_id
          )
        )
      `)
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Verify ownership
    const fileOwner = (file as any).modules.courses.user_id;
    if (fileOwner !== userId) {
      throw new Error(`Access denied: User ${userId} cannot access file ${fileId}`);
    }

    return file;
  }

  /**
   * Extracts content with retry logic for transient failures
   */
  private async extractContentWithRetry(file: any, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[FileProcessor] Extracting content (attempt ${attempt}): ${file.mime_type}`);

        switch (file.mime_type) {
          case 'application/pdf':
            return await this.fileProcessingService.extractPdfText(file.storage_path);
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return await this.fileProcessingService.extractWordText(file.storage_path);
          default:
            if (file.mime_type?.startsWith('text/')) {
              return await this.fileProcessingService.extractPlainText(file.storage_path);
            }
            throw new Error(`Unsupported file type: ${file.mime_type}`);
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        logger.warn(`[FileProcessor] Extraction attempt ${attempt} failed, retrying...`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          nextAttemptIn: `${attempt * 1000}ms`
        });
        
        // Exponential backoff
        await this.sleep(1000 * attempt);
      }
    }
    
    throw new Error('Content extraction failed after all retries');
  }

  /**
   * Performs semantic chunking with configuration
   */
  private async performSemanticChunking(
    content: string, 
    filename: string, 
    options?: FileProcessingJob['processingOptions']
  ): Promise<any[]> {
    return this.fileProcessingService.chunkContent(content, filename, {
      minChunkSize: 200,
      maxChunkSize: options?.chunkSize || 1500,
      preserveStructure: true,
      adaptiveSize: true,
      includeMetadata: true,
      overlapSize: 50
    });
  }

  /**
   * Saves chunks to database with batch insertion and sanitization
   */
  private async saveChunksBatch(fileId: string, chunks: any[]): Promise<any[]> {
    const chunksToInsert = chunks.map((chunk: any, index: number) => {
      // Sanitize all text content
      const sanitizedContent = this.fileProcessingService.sanitizeChunkContent(chunk.content);
      const sanitizedSectionTitle = chunk.metadata?.title 
        ? this.fileProcessingService.sanitizeChunkContent(chunk.metadata.title)
        : null;
      const sanitizedConcepts = Array.isArray(chunk.metadata?.concepts) 
        ? chunk.metadata.concepts.map((concept: string) => 
            typeof concept === 'string' 
              ? this.fileProcessingService.sanitizeChunkContent(concept)
              : concept
          )
        : [];

      return {
        file_id: fileId,
        chunk_index: index,
        content: sanitizedContent,
        content_length: sanitizedContent.length,
        chunk_type: chunk.metadata?.type || 'text',
        importance: chunk.metadata?.importance || 'medium',
        section_title: sanitizedSectionTitle,
        hierarchy_level: chunk.metadata?.level || 0,
        concepts: sanitizedConcepts,
        metadata: {
          ...chunk.metadata,
          sanitized: true,
          originalLength: chunk.content.length
        },
        created_at: new Date().toISOString()
      };
    });

    const { data: insertedChunks, error } = await supabase
      .from('file_chunks')
      .insert(chunksToInsert)
      .select('id, content, chunk_index, metadata');

    if (error) {
      throw new Error(`Failed to save chunks: ${error.message}`);
    }

    if (!insertedChunks || insertedChunks.length === 0) {
      throw new Error('No chunks were saved to database');
    }

    logger.info(`[FileProcessor] Saved ${insertedChunks.length} chunks to database`);

    return insertedChunks;
  }

  /**
   * Updates file status with additional metadata
   */
  private async updateFileStatus(
    fileId: string, 
    status: string, 
    additionalFields?: Record<string, any>
  ): Promise<void> {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalFields
    };

    const { error } = await supabase
      .from('course_files')
      .update(updateData)
      .eq('id', fileId);

    if (error) {
      logger.error(`[FileProcessor] Failed to update file status:`, error);
      throw new Error(`Failed to update file status: ${error.message}`);
    }

    logger.debug(`[FileProcessor] Updated file status: ${fileId} -> ${status}`);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}