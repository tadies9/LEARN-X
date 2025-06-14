import { Job } from 'bull';
import { FILE_PROCESSING_QUEUE, EMBEDDING_QUEUE, NOTIFICATION_QUEUE } from '../config/queue';
import { FileProcessingService } from '../services/fileProcessingService';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const fileProcessingService = new FileProcessingService();

interface FileProcessingJobData {
  fileId: string;
  userId: string;
  processingOptions?: {
    generateSummary?: boolean;
    extractKeypoints?: boolean;
    generateQuestions?: boolean;
    chunkSize?: number;
  };
}

// Process files
FILE_PROCESSING_QUEUE.process('process-file', async (job: Job<FileProcessingJobData>) => {
  const { fileId, userId, processingOptions } = job.data;

  try {
    logger.info(`Starting file processing for file ${fileId}`);

    // Update file status to processing
    await supabase.from('course_files').update({ status: 'processing' }).eq('id', fileId);

    // Get file details
    const { data: file, error: fileError } = await supabase
      .from('course_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      throw new Error('File not found');
    }

    // Process based on file type
    let extractedContent: string;

    if (file.mime_type === 'pdf' || file.mime_type === 'application/pdf') {
      extractedContent = await fileProcessingService.extractPdfText(file.storage_path);
    } else if (file.mime_type.includes('word') || file.mime_type.includes('doc')) {
      extractedContent = await fileProcessingService.extractWordText(file.storage_path);
    } else if (file.mime_type.includes('text') || file.mime_type === 'txt') {
      extractedContent = await fileProcessingService.extractPlainText(file.storage_path);
    } else {
      throw new Error(`Unsupported file type: ${file.mime_type}`);
    }

    // Update job progress
    await job.progress(30);

    // Extract metadata
    const metadata = await fileProcessingService.extractMetadata(
      extractedContent,
      file.name || file.original_name
    );
    await job.progress(40);

    // Chunk the content
    const chunks = await fileProcessingService.chunkContent(
      extractedContent,
      processingOptions?.chunkSize || 1000
    );
    await job.progress(60);

    // Store chunks in database
    const chunkRecords = chunks.map((chunk, index) => ({
      file_id: fileId,
      content: chunk.content,
      metadata: chunk.metadata,
      chunk_index: index,
    }));

    const { error: chunkError } = await supabase.from('file_chunks').insert(chunkRecords);

    if (chunkError) {
      throw chunkError;
    }

    await job.progress(80);

    // Get chunk IDs from the inserted records
    const { data: insertedChunks } = await supabase
      .from('file_chunks')
      .select('id, content, chunk_index')
      .eq('file_id', fileId)
      .order('chunk_index');

    // Queue embedding generation for all chunks at once
    if (insertedChunks && insertedChunks.length > 0) {
      await EMBEDDING_QUEUE.add('generate-embeddings', {
        fileId,
        userId,
        chunks: insertedChunks.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          position: chunk.chunk_index,
        })),
      });
    }

    // Update file status and metadata
    await supabase
      .from('course_files')
      .update({
        status: 'processed',
        metadata: {
          ...file.metadata,
          ...metadata,
          totalChunks: chunks.length,
          processedAt: new Date().toISOString(),
        },
      })
      .eq('id', fileId);

    await job.progress(100);

    // Send notification
    await NOTIFICATION_QUEUE.add('send-notification', {
      userId,
      type: 'file-processed',
      data: {
        fileId,
        fileName: file.name || file.original_name,
        chunkCount: chunks.length,
      },
    });

    logger.info(`File processing completed for file ${fileId}`);

    return {
      fileId,
      chunksCreated: chunks.length,
      metadata,
    };
  } catch (error) {
    logger.error(`Error processing file ${fileId}:`, error);

    // Update file status to failed
    await supabase
      .from('course_files')
      .update({
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
      })
      .eq('id', fileId);

    throw error;
  }
});

// Handle file deletion cleanup
FILE_PROCESSING_QUEUE.process('cleanup-file', async (job: Job<{ fileId: string }>) => {
  const { fileId } = job.data;

  try {
    // Delete chunks
    await supabase.from('file_chunks').delete().eq('file_id', fileId);

    // Delete embeddings
    await supabase.from('chunk_embeddings').delete().eq('file_id', fileId);

    return { success: true };
  } catch (error) {
    logger.error(`Error cleaning up file ${fileId}:`, error);
    throw error;
  }
});
