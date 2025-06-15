#!/usr/bin/env node
/**
 * Simple Enhanced PGMQ Setup
 * Creates the essential components using Supabase RPC calls
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupEnhancedPGMQ() {
  console.log('🚀 Setting up Enhanced PGMQ...\n');

  try {
    // Step 1: Create basic queues using pgmq.create
    console.log('📋 Creating PGMQ queues...');
    
    const queues = [
      'file_processing',
      'embedding_generation', 
      'notification',
      'cleanup'
    ];

    for (const queueName of queues) {
      try {
        const { data, error } = await supabase.rpc('pgmq.create', { queue_name: queueName });
        if (error && !error.message.includes('already exists')) {
          console.error(`❌ Failed to create queue ${queueName}:`, error.message);
        } else {
          console.log(`✅ Queue created: ${queueName}`);
        }
      } catch (err) {
        console.log(`⚠️  Queue ${queueName} may already exist`);
      }
    }

    // Step 2: Create enhanced job tracking table
    console.log('\n📊 Creating enhanced job tracking...');
    
    try {
      // Create the table using Supabase client
      const { data, error } = await supabase
        .from('enhanced_job_tracking')
        .select('id')
        .limit(1);
        
      if (error && error.code === '42P01') {
        console.log('Creating enhanced_job_tracking table via SQL editor...');
        console.log('Please run this SQL in your Supabase SQL editor:');
        console.log('\n' + '='.repeat(80));
        console.log(`
-- Enhanced Job Tracking Table
CREATE TABLE IF NOT EXISTS enhanced_job_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id BIGINT NOT NULL,
  queue_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_queue_status 
  ON enhanced_job_tracking(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_created_at 
  ON enhanced_job_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_message_id 
  ON enhanced_job_tracking(message_id);

-- RLS Policies
ALTER TABLE enhanced_job_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage job tracking" ON enhanced_job_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON enhanced_job_tracking TO service_role;
        `);
        console.log('='.repeat(80));
        console.log('\nAfter running the SQL, press any key to continue...');
        
        // Wait for user input
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
      } else {
        console.log('✅ Enhanced job tracking table exists');
      }
    } catch (err) {
      console.log('⚠️  Enhanced job tracking table may need manual creation');
    }

    // Step 3: Verify setup
    console.log('\n🔍 Verifying setup...');
    
    // Check queues
    const { data: queueMetrics, error: metricsError } = await supabase.rpc('pgmq.metrics_all');
    
    if (metricsError) {
      console.error('❌ Failed to get queue metrics:', metricsError.message);
    } else {
      console.log('✅ PGMQ queues verified:');
      queueMetrics.forEach(queue => {
        if (queues.includes(queue.queue_name)) {
          console.log(`  ✓ ${queue.queue_name}: ${queue.queue_length} messages`);
        }
      });
    }

    // Check job tracking table
    const { data: trackingData, error: trackingError } = await supabase
      .from('enhanced_job_tracking')
      .select('count')
      .limit(1);

    if (trackingError) {
      console.log('⚠️  Enhanced job tracking needs manual setup (see SQL above)');
    } else {
      console.log('✅ Enhanced job tracking table verified');
    }

    console.log('\n🎉 Enhanced PGMQ setup completed!');
    console.log('\nNext steps:');
    console.log('1. If you saw SQL above, run it in Supabase SQL editor');
    console.log('2. Build your application: npm run build');
    console.log('3. Test with: node test-enhanced-pipeline.js');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

setupEnhancedPGMQ().catch(console.error);