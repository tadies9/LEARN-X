import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

async function cleanupStuckJobs() {
  try {
    // First, let's check what's in the job_tracking table
    const { data: stuckJobs, error: trackingError } = await supabase
      .from('job_tracking')
      .select('*')
      .in('status', ['failed', 'dead', 'processing'])
      .order('created_at', { ascending: false });

    if (trackingError) {
      logger.error('Error fetching stuck jobs:', trackingError);
    } else {
      logger.info(`Found ${stuckJobs?.length || 0} stuck jobs in tracking table`);

      if (stuckJobs && stuckJobs.length > 0) {
        // Delete the test job specifically
        const testJob = stuckJobs.find((job) => job.id === '7e1feb56-c87c-4ceb-8242-8acc4f9939af');
        if (testJob) {
          logger.info('Found test job, deleting...');
          const { error: deleteError } = await supabase
            .from('job_tracking')
            .delete()
            .eq('id', '7e1feb56-c87c-4ceb-8242-8acc4f9939af');

          if (deleteError) {
            logger.error('Error deleting test job:', deleteError);
          } else {
            logger.info('Test job deleted successfully');
          }
        }

        // Log all stuck jobs
        stuckJobs.forEach((job) => {
          logger.info(
            `Stuck job: ${job.id} - ${job.job_type} - ${job.status} - ${job.error_message || 'No error'}`
          );
        });
      }
    }

    // Now check the actual PGMQ queues
    const queues = ['file_processing', 'embedding_generation', 'notification'];

    for (const queueName of queues) {
      try {
        // Archive any messages that have been retried too many times
        const { data: archivedData, error: archiveError } = await supabase.rpc('pgmq_archive', {
          queue_name: queueName,
          max_age_seconds: 300, // Archive messages older than 5 minutes
        });

        if (archiveError) {
          logger.error(`Error archiving from ${queueName}:`, archiveError);
        } else {
          logger.info(`Archived ${archivedData || 0} messages from ${queueName}`);
        }
      } catch (err) {
        logger.error(`Failed to process queue ${queueName}:`, err);
      }
    }

    logger.info('Cleanup complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupStuckJobs();
