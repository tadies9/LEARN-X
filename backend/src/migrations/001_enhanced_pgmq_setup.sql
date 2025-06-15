-- Enhanced PGMQ Setup Migration
-- Creates enhanced queue infrastructure with Supabase optimizations

-- Install pgmq extension if not already installed
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create enhanced queue creation function with type support
CREATE OR REPLACE FUNCTION pgmq_create_enhanced(
    queue_name TEXT,
    queue_type TEXT DEFAULT 'standard',
    partition_interval TEXT DEFAULT NULL,
    retention_interval TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Create queue based on type
    CASE queue_type
        WHEN 'unlogged' THEN
            PERFORM pgmq.create_unlogged(queue_name);
        WHEN 'partitioned' THEN
            PERFORM pgmq.create_partitioned(
                queue_name, 
                partition_interval::INTERVAL, 
                retention_interval::INTERVAL
            );
        ELSE
            PERFORM pgmq.create(queue_name);
    END CASE;
    
    -- Log queue creation
    RAISE NOTICE 'Created % queue: %', queue_type, queue_name;
END;
$$ LANGUAGE plpgsql;

-- Create the enhanced queues
SELECT pgmq_create_enhanced('file_processing', 'unlogged');
SELECT pgmq_create_enhanced('embedding_generation', 'partitioned', 'daily', '7 days');
SELECT pgmq_create_enhanced('notification', 'standard');
SELECT pgmq_create_enhanced('cleanup', 'standard');

-- Create enhanced job tracking table with better indexing
CREATE TABLE IF NOT EXISTS enhanced_job_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    message_id BIGINT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'archived')),
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    processing_time_ms INTEGER,
    worker_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_status ON enhanced_job_tracking(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_queue_status ON enhanced_job_tracking(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_created_at ON enhanced_job_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_message_id ON enhanced_job_tracking(message_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_tracking_payload_file_id ON enhanced_job_tracking USING GIN((payload->>'fileId'));

-- Enable RLS on enhanced job tracking
ALTER TABLE enhanced_job_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for enhanced job tracking
CREATE POLICY "Service role has full access to enhanced job tracking" ON enhanced_job_tracking
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Queue metrics view for monitoring
CREATE OR REPLACE VIEW enhanced_queue_metrics AS
SELECT 
    queue_name,
    COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
    AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL) as avg_processing_time_ms,
    MAX(created_at) as last_job_created,
    MIN(created_at) FILTER (WHERE status IN ('queued', 'processing')) as oldest_pending_job
FROM enhanced_job_tracking
GROUP BY queue_name;

-- Enhanced queue management functions
CREATE OR REPLACE FUNCTION get_enhanced_queue_health()
RETURNS TABLE(
    queue_name TEXT,
    status TEXT,
    queue_depth BIGINT,
    processing_count BIGINT,
    failed_count BIGINT,
    oldest_message_age_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.queue_name::TEXT,
        CASE 
            WHEN m.queue_length > 1000 THEN 'unhealthy'
            WHEN m.queue_length > 100 THEN 'degraded'
            ELSE 'healthy'
        END::TEXT as status,
        m.queue_length,
        COALESCE(ejt.processing_count, 0),
        COALESCE(ejt.failed_count, 0),
        COALESCE(EXTRACT(EPOCH FROM (NOW() - m.oldest_msg_age))::INTEGER, 0)
    FROM pgmq.metrics_all() m
    LEFT JOIN (
        SELECT 
            queue_name,
            COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_count
        FROM enhanced_job_tracking
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY queue_name
    ) ejt ON m.queue_name = ejt.queue_name;
END;
$$ LANGUAGE plpgsql;

-- Function to mark jobs as started
CREATE OR REPLACE FUNCTION mark_enhanced_job_started(
    p_message_id BIGINT,
    p_worker_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE enhanced_job_tracking 
    SET 
        status = 'processing',
        started_at = NOW(),
        worker_id = p_worker_id,
        attempts = attempts + 1
    WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark jobs as completed
CREATE OR REPLACE FUNCTION mark_enhanced_job_completed(
    p_message_id BIGINT,
    p_processing_time_ms INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE enhanced_job_tracking 
    SET 
        status = 'completed',
        completed_at = NOW(),
        processing_time_ms = COALESCE(p_processing_time_ms, EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)
    WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark jobs as failed
CREATE OR REPLACE FUNCTION mark_enhanced_job_failed(
    p_message_id BIGINT,
    p_error_message TEXT,
    p_should_retry BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
    UPDATE enhanced_job_tracking 
    SET 
        status = CASE 
            WHEN p_should_retry AND attempts < max_attempts THEN 'queued'
            ELSE 'failed'
        END,
        failed_at = NOW(),
        error_message = p_error_message
    WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old completed jobs
CREATE OR REPLACE FUNCTION cleanup_enhanced_job_tracking(
    p_days_to_keep INTEGER DEFAULT 7
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM enhanced_job_tracking
        WHERE status IN ('completed', 'failed', 'archived')
        AND completed_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to enqueue jobs with tracking
CREATE OR REPLACE FUNCTION enqueue_enhanced_job(
    p_queue_name TEXT,
    p_job_type TEXT,
    p_payload JSONB,
    p_delay_seconds INTEGER DEFAULT 0,
    p_priority INTEGER DEFAULT 5
) RETURNS BIGINT AS $$
DECLARE
    message_id BIGINT;
    job_id UUID;
BEGIN
    -- Generate job ID
    job_id := gen_random_uuid();
    
    -- Add job_id to payload
    p_payload := p_payload || jsonb_build_object('job_id', job_id);
    
    -- Send message to queue
    SELECT pgmq.send(p_queue_name, p_payload, p_delay_seconds) INTO message_id;
    
    -- Track in enhanced job tracking
    INSERT INTO enhanced_job_tracking (
        id, queue_name, job_type, message_id, payload, priority
    ) VALUES (
        job_id, p_queue_name, p_job_type, message_id, p_payload, p_priority
    );
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pgmq TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgmq TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;

-- Grant permissions on enhanced functions
GRANT EXECUTE ON FUNCTION pgmq_create_enhanced TO service_role;
GRANT EXECUTE ON FUNCTION get_enhanced_queue_health TO service_role;
GRANT EXECUTE ON FUNCTION mark_enhanced_job_started TO service_role;
GRANT EXECUTE ON FUNCTION mark_enhanced_job_completed TO service_role;
GRANT EXECUTE ON FUNCTION mark_enhanced_job_failed TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_enhanced_job_tracking TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_enhanced_job TO service_role;

-- Grant permissions on enhanced job tracking table
GRANT ALL ON enhanced_job_tracking TO service_role;
GRANT SELECT ON enhanced_queue_metrics TO service_role;

-- Insert initial queue configuration
INSERT INTO enhanced_job_tracking (queue_name, job_type, payload, status, message_id) 
VALUES 
    ('file_processing', 'system_init', '{"message": "Enhanced PGMQ initialized"}', 'completed', 0),
    ('embedding_generation', 'system_init', '{"message": "Enhanced PGMQ initialized"}', 'completed', 0),
    ('notification', 'system_init', '{"message": "Enhanced PGMQ initialized"}', 'completed', 0),
    ('cleanup', 'system_init', '{"message": "Enhanced PGMQ initialized"}', 'completed', 0);

-- Log successful setup
DO $$
BEGIN
    RAISE NOTICE 'Enhanced PGMQ setup completed successfully';
    RAISE NOTICE 'Created queues: file_processing (unlogged), embedding_generation (partitioned), notification, cleanup';
    RAISE NOTICE 'Enhanced job tracking and monitoring enabled';
END $$;