import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

async function cleanupTestJobs() {
  try {
    // Clean up the specific test job from job_tracking
    const testJobId = '7e1feb56-c87c-4ceb-8242-8acc4f9939af';

    logger.info('Cleaning up test job from job_tracking...');
    const { error: deleteError } = await supabase.from('job_tracking').delete().eq('id', testJobId);

    if (deleteError) {
      logger.error('Error deleting test job:', deleteError);
    } else {
      logger.info('Test job deleted from tracking');
    }

    // Archive any messages from PGMQ queues that are for test jobs
    const queues = ['file_processing', 'embedding_generation', 'notification'];

    for (const queueName of queues) {
      logger.info(`Checking queue: ${queueName}`);

      // Read messages to find test jobs
      const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
        queue_name: queueName,
        vt: 0, // Don't hide messages
        qty: 100,
      });

      if (readError) {
        logger.error(`Error reading from ${queueName}:`, readError);
        continue;
      }

      if (messages && messages.length > 0) {
        logger.info(`Found ${messages.length} messages in ${queueName}`);

        for (const message of messages) {
          try {
            const msgData = message.message;
            // Check if it's a test job or has no fileId
            if (
              msgData.job_id === testJobId ||
              msgData.job_type === 'test_job' ||
              (!msgData.payload?.fileId && msgData.job_type === 'process_file')
            ) {
              logger.info(`Archiving test/invalid message ${message.msg_id} from ${queueName}`);

              const { error: archiveError } = await supabase.rpc('pgmq_archive', {
                queue_name: queueName,
                msg_id: message.msg_id,
              });

              if (archiveError) {
                logger.error(`Error archiving message ${message.msg_id}:`, archiveError);
              } else {
                logger.info(`Archived message ${message.msg_id}`);
              }
            }
          } catch (err) {
            logger.error(`Error processing message ${message.msg_id}:`, err);
          }
        }
      }
    }

    // Clean up any failed embedding jobs without valid file IDs
    logger.info('Cleaning up failed jobs from job_tracking...');
    const { data: failedJobs, error: failedError } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('status', 'failed')
      .is('error_message', null);

    if (!failedError && failedJobs) {
      logger.info(`Found ${failedJobs.length} failed jobs to clean`);
      for (const job of failedJobs) {
        const { error } = await supabase.from('job_tracking').delete().eq('id', job.id);

        if (!error) {
          logger.info(`Deleted failed job ${job.id}`);
        }
      }
    }

    logger.info('Cleanup complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupTestJobs();
