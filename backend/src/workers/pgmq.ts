import { pgmqService } from '../services/queue/PGMQService';
import { EnhancedFileProcessingService } from '../services/EnhancedFileProcessingService';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

// Initialize services
const fileProcessingService = new EnhancedFileProcessingService();

// Queue names
export const QUEUE_NAMES = {
  FILE_PROCESSING: 'file_processing',
  EMBEDDING: 'embedding_generation',
  NOTIFICATION: 'notification',
} as const;

/**
 * File processing worker
 */
async function processFileJob(job: any): Promise<void> {
  logger.info(`[FileProcessor] Processing job ${job.id}`, {
    jobType: job.jobType,
    fileId: job.payload.fileId,
  });

  const { fileId, userId, processingOptions } = job.payload;

  try {
    // Get file details
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
      throw new Error(`User ${userId} does not own file ${fileId}`);
    }

    // Update status to processing
    await supabase
      .from('course_files')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    // Extract content from file based on mime type
    let extractedContent: string;
    if (file.mime_type === 'application/pdf') {
      extractedContent = await fileProcessingService.extractPdfText(file.storage_path);
    } else if (file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedContent = await fileProcessingService.extractWordText(file.storage_path);
    } else if (file.mime_type?.startsWith('text/')) {
      extractedContent = await fileProcessingService.extractPlainText(file.storage_path);
    } else {
      throw new Error(`Unsupported file type: ${file.mime_type}`);
    }

    if (!extractedContent || extractedContent.trim().length === 0) {
      throw new Error('No content could be extracted from file');
    }

    // Perform semantic chunking
    const chunks = await fileProcessingService.chunkContent(
      extractedContent,
      file.filename || file.original_name,
      {
        minChunkSize: 200,
        maxChunkSize: processingOptions?.chunkSize || 1500,
        preserveStructure: true,
        adaptiveSize: true,
        includeMetadata: true,
      }
    );

    logger.info(`[FileProcessor] Created ${chunks.length} semantic chunks for file ${fileId}`);

    // Save chunks to database
    const chunksToInsert = chunks.map((chunk: any, index: number) => ({
      file_id: fileId,
      chunk_index: index,
      content: chunk.content,
      content_length: chunk.content.length,
      chunk_type: chunk.metadata?.type || 'text',
      importance: chunk.metadata?.importance || 'medium',
      section_title: chunk.metadata?.title || null,
      hierarchy_level: chunk.metadata?.level || 0,
      concepts: chunk.metadata?.concepts || [],
      created_at: new Date().toISOString(),
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('file_chunks')
      .insert(chunksToInsert)
      .select('id, content, chunk_index');

    if (chunksError || !insertedChunks) {
      throw new Error(`Failed to save chunks: ${chunksError?.message}`);
    }

    // Queue embedding generation for all chunks as a batch
    await pgmqService.enqueue(
      QUEUE_NAMES.EMBEDDING,
      'generate_embeddings',
      {
        fileId,
        userId,
        chunks: insertedChunks.map((chunk) => ({
          id: chunk.id,
          fileId,
          content: chunk.content,
          position: chunk.chunk_index,
        })),
      }
    );

    // Update file status to completed
    await supabase
      .from('course_files')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    logger.info(`[FileProcessor] Successfully processed file ${fileId}`);

  } catch (error) {
    logger.error(`[FileProcessor] Failed to process file ${fileId}:`, error);
    
    // Update file status to failed
    await supabase
      .from('course_files')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);
    
    throw error;
  }
}

/**
 * Embedding generation worker - uses VectorEmbeddingService for proper batch processing
 */
async function processEmbeddingJob(job: any): Promise<void> {
  logger.info(`[EmbeddingGenerator] Processing job ${job.id}`, {
    jobType: job.jobType,
    fileId: job.payload.fileId,
  });

  const { fileId, userId, chunks } = job.payload;

  try {
    // Import the VectorEmbeddingService
    const { VectorEmbeddingService } = await import('../services/embeddings/VectorEmbeddingService');
    const embeddingService = new VectorEmbeddingService();

    logger.info(`[EmbeddingGenerator] Generating embeddings for ${chunks.length} chunks of file ${fileId}`);

    // Process chunks using the proper service
    await embeddingService.processBatch(chunks, userId);

    // Update file status to completed
    await supabase
      .from('course_files')
      .update({
        status: 'completed',
        metadata: {
          embedding_status: 'completed',
          embeddings_generated_at: new Date().toISOString(),
          embedding_model: 'text-embedding-3-small',
          vector_storage: true,
        },
      })
      .eq('id', fileId);

    logger.info(`[EmbeddingGenerator] Successfully generated embeddings for file ${fileId}`);

  } catch (error) {
    logger.error(`[EmbeddingGenerator] Failed to generate embeddings for file ${fileId}:`, error);
    
    // Update file status to failed
    await supabase
      .from('course_files')
      .update({
        status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Embedding generation failed',
        metadata: {
          embedding_status: 'failed',
          embedding_error: error instanceof Error ? error.message : 'Unknown error',
          failed_at: new Date().toISOString(),
        },
      })
      .eq('id', fileId);

    throw error;
  }
}

/**
 * Notification worker
 */
async function processNotificationJob(job: any): Promise<void> {
  logger.info(`[NotificationProcessor] Processing job ${job.id}`, {
    jobType: job.jobType,
    notificationType: job.payload.type,
  });

  const { type, userId, data } = job.payload;

  try {
    // Create notification in database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title: data.title,
        message: data.message,
        data: data.metadata || {},
        read: false,
        created_at: new Date().toISOString(),
      });

    if (notificationError) {
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }

    logger.info(`[NotificationProcessor] Created ${type} notification for user ${userId}`);

  } catch (error) {
    logger.error(`[NotificationProcessor] Failed to process notification:`, error);
    throw error;
  }
}

/**
 * Start all PGMQ workers
 */
export async function startPGMQWorkers(): Promise<void> {
  logger.info('[PGMQ] Starting all workers...');

  try {
    // Start file processing worker
    pgmqService.processQueue(
      QUEUE_NAMES.FILE_PROCESSING,
      processFileJob,
      {
        batchSize: 1,
        pollInterval: 2000,
        visibilityTimeout: 60,
      }
    );

    // Start embedding worker
    pgmqService.processQueue(
      QUEUE_NAMES.EMBEDDING,
      processEmbeddingJob,
      {
        batchSize: 5,
        pollInterval: 1000,
        visibilityTimeout: 30,
      }
    );

    // Start notification worker
    pgmqService.processQueue(
      QUEUE_NAMES.NOTIFICATION,
      processNotificationJob,
      {
        batchSize: 10,
        pollInterval: 5000,
        visibilityTimeout: 15,
      }
    );

    logger.info('[PGMQ] All workers started successfully');

  } catch (error) {
    logger.error('[PGMQ] Failed to start workers:', error);
    throw error;
  }
}

/**
 * Stop all PGMQ workers
 */
export function stopPGMQWorkers(): void {
  logger.info('[PGMQ] Stopping all workers...');
  
  pgmqService.stopProcessing(QUEUE_NAMES.FILE_PROCESSING);
  pgmqService.stopProcessing(QUEUE_NAMES.EMBEDDING);
  pgmqService.stopProcessing(QUEUE_NAMES.NOTIFICATION);
  
  logger.info('[PGMQ] All workers stopped');
}

// Export job enqueuers for use in other parts of the application
export const enqueueFileProcessing = async (
  fileId: string,
  userId: string,
  processingOptions?: any
) => {
  return pgmqService.enqueue(
    QUEUE_NAMES.FILE_PROCESSING,
    'process_file',
    { fileId, userId, processingOptions }
  );
};

export const enqueueEmbeddingGeneration = async (
  fileId: string,
  chunkIndex: number,
  content: string,
  userId: string
) => {
  return pgmqService.enqueue(
    QUEUE_NAMES.EMBEDDING,
    'generate_embedding',
    { fileId, chunkIndex, content, userId }
  );
};

export const enqueueNotification = async (
  type: string,
  userId: string,
  data: any
) => {
  return pgmqService.enqueue(
    QUEUE_NAMES.NOTIFICATION,
    'send_notification',
    { type, userId, data }
  );
};