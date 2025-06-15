/**
 * Script to fix and clean up PGMQ queues
 * Run with: npx ts-node src/workers/fix-queues.ts
 */

import { supabase } from '../config/supabase';

async function cleanupQueues() {
  console.log('Cleaning up PGMQ queues...');
  
  try {
    // Delete all messages from the file_processing queue
    const { data: deleted1, error: error1 } = await supabase.rpc('pgmq_delete_all', {
      queue_name: 'file_processing'
    });
    
    if (error1) {
      console.error('Error deleting from file_processing:', error1);
    } else {
      console.log(`Deleted ${deleted1 || 0} messages from file_processing queue`);
    }
    
    // Delete all messages from the embedding_generation queue
    const { data: deleted2, error: error2 } = await supabase.rpc('pgmq_delete_all', {
      queue_name: 'embedding_generation'
    });
    
    if (error2) {
      console.error('Error deleting from embedding_generation:', error2);
    } else {
      console.log(`Deleted ${deleted2 || 0} messages from embedding_generation queue`);
    }
    
    // Clear job_tracking table of failed jobs
    const { data: cleared, error: clearError } = await supabase
      .from('job_tracking')
      .delete()
      .in('status', ['failed', 'dead'])
      .select();
      
    if (clearError) {
      console.error('Error clearing job_tracking:', clearError);
    } else {
      console.log(`Cleared ${cleared?.length || 0} failed/dead jobs from job_tracking`);
    }
    
    console.log('Queue cleanup complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

cleanupQueues();