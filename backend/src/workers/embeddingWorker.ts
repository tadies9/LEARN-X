import { Job } from 'bull';
import { EMBEDDING_QUEUE, NOTIFICATION_QUEUE } from '../config/queue';
import { logger } from '../utils/logger';
import { EmbeddingService } from '../services/embeddings/EmbeddingService';
import { supabase } from '../config/supabase';

interface EmbeddingJobData {
  fileId: string;
  userId: string;
  chunks: Array<{
    id: string;
    content: string;
    position: number;
  }>;
}

const embeddingService = new EmbeddingService();

// Process embeddings for all chunks of a file
EMBEDDING_QUEUE.process('generate-embeddings', async (job: Job<EmbeddingJobData>) => {
  const { fileId, userId, chunks } = job.data;

  try {
    logger.info(`Generating embeddings for ${chunks.length} chunks of file ${fileId}`);

    // Update file status to processing
    await supabase
      .from('files')
      .update({ embedding_status: 'processing' })
      .eq('id', fileId);

    // Process chunks in batches
    await embeddingService.processBatch(
      chunks.map(chunk => ({
        id: chunk.id,
        fileId,
        content: chunk.content,
        position: chunk.position,
      })),
      userId
    );

    // Update file status to completed
    await supabase
      .from('files')
      .update({ 
        embedding_status: 'completed',
        embeddings_generated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    // Send notification
    await NOTIFICATION_QUEUE.add('send-notification', {
      userId,
      type: 'embeddings_ready',
      title: 'Content Ready for AI Features',
      message: 'Your file has been processed and is now ready for AI-powered learning.',
      data: { fileId },
    });

    logger.info(`Successfully generated embeddings for file ${fileId}`);

    return {
      success: true,
      message: `Generated embeddings for ${chunks.length} chunks`,
    };
  } catch (error) {
    logger.error(`Error generating embeddings for file ${fileId}:`, error);
    
    // Update file status to failed
    await supabase
      .from('files')
      .update({ embedding_status: 'failed' })
      .eq('id', fileId);
    
    // Send error notification
    await NOTIFICATION_QUEUE.add('send-notification', {
      userId,
      type: 'embeddings_failed',
      title: 'AI Processing Failed',
      message: 'There was an error processing your file for AI features. Please try again.',
      data: { fileId, error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    throw error;
  }
});
