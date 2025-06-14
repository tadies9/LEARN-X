-- Enable PGMQ extension for PostgreSQL-based message queuing
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queues for different job types
SELECT pgmq.create('file_processing');
SELECT pgmq.create('embedding_generation');
SELECT pgmq.create('notification');
SELECT pgmq.create('cleanup');

-- Create archive tables for completed/failed messages
SELECT pgmq.create_archive('file_processing');
SELECT pgmq.create_archive('embedding_generation');
SELECT pgmq.create_archive('notification');
SELECT pgmq.create_archive('cleanup');

-- Create custom job tracking table for enhanced monitoring
CREATE TABLE IF NOT EXISTS job_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  message_id BIGINT,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'queued', -- queued, processing, completed, failed, dead
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  metadata JSONB DEFAULT '{}',
  
  -- Indexes for performance
  INDEX idx_job_tracking_status (status),
  INDEX idx_job_tracking_queue_name (queue_name),
  INDEX idx_job_tracking_created_at (created_at DESC),
  INDEX idx_job_tracking_message_id (message_id)
);

-- Create function to enqueue jobs with tracking
CREATE OR REPLACE FUNCTION enqueue_job(
  p_queue_name TEXT,
  p_job_type TEXT,
  p_payload JSONB,
  p_delay_seconds INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
  v_message_id BIGINT;
BEGIN
  -- Create tracking record
  INSERT INTO job_tracking (queue_name, job_type, payload, status)
  VALUES (p_queue_name, p_job_type, p_payload, 'queued')
  RETURNING id INTO v_job_id;
  
  -- Enqueue message with job ID in payload
  SELECT pgmq.send(
    p_queue_name,
    jsonb_build_object(
      'job_id', v_job_id,
      'job_type', p_job_type,
      'payload', p_payload
    ),
    p_delay_seconds
  ) INTO v_message_id;
  
  -- Update tracking with message ID
  UPDATE job_tracking
  SET message_id = v_message_id
  WHERE id = v_job_id;
  
  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark job as started
CREATE OR REPLACE FUNCTION mark_job_started(p_job_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE job_tracking
  SET 
    status = 'processing',
    started_at = now(),
    attempts = attempts + 1
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark job as completed
CREATE OR REPLACE FUNCTION mark_job_completed(p_job_id UUID, p_result JSONB DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE job_tracking
  SET 
    status = 'completed',
    completed_at = now(),
    metadata = COALESCE(metadata, '{}') || COALESCE(p_result, '{}')
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark job as failed
CREATE OR REPLACE FUNCTION mark_job_failed(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  -- Get current attempts and max attempts
  SELECT attempts, max_attempts
  INTO v_attempts, v_max_attempts
  FROM job_tracking
  WHERE id = p_job_id;
  
  -- Update job status
  UPDATE job_tracking
  SET 
    status = CASE 
      WHEN v_attempts >= v_max_attempts THEN 'dead'
      ELSE 'failed'
    END,
    failed_at = now(),
    error_message = p_error_message,
    error_details = p_error_details
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for monitoring queue health
CREATE OR REPLACE VIEW queue_health AS
SELECT 
  queue_name,
  COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > now() - interval '1 hour') as completed_last_hour,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'dead') as dead_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_processing_time_seconds,
  MAX(created_at) as last_job_created
FROM job_tracking
WHERE created_at > now() - interval '24 hours'
GROUP BY queue_name;

-- Create function for poison message detection
CREATE OR REPLACE FUNCTION check_poison_message(p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INTEGER;
  v_error_pattern TEXT;
  v_similar_errors INTEGER;
BEGIN
  -- Get job details
  SELECT attempts, error_message
  INTO v_attempts, v_error_pattern
  FROM job_tracking
  WHERE id = p_job_id;
  
  -- Check if too many attempts
  IF v_attempts >= 5 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if similar errors in recent jobs
  IF v_error_pattern IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_similar_errors
    FROM job_tracking
    WHERE 
      error_message LIKE v_error_pattern
      AND created_at > now() - interval '1 hour'
      AND id != p_job_id;
    
    IF v_similar_errors >= 10 THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup function for old jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(p_days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM job_tracking
  WHERE 
    status IN ('completed', 'dead')
    AND created_at < now() - (p_days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add to migration tracking
INSERT INTO schema_migrations (version, name) 
VALUES (3, '003_pgmq_setup.sql')
ON CONFLICT (version) DO NOTHING;