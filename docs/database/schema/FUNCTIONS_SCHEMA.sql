-- ============================================================================
-- LEARN-X RPC FUNCTIONS DOCUMENTATION
-- ============================================================================
-- This file documents all RPC (Remote Procedure Call) functions used in the
-- Learn-X application via Supabase client .rpc() calls
--
-- IMPORTANT: Most PGMQ functions are in the 'pgmq' schema, not 'public'
-- Usage: supabase.rpc('pgmq.function_name', params) for PGMQ functions
--
-- Updated: 2025-06-15 (verified against actual database)
-- ============================================================================

-- ============================================================================
-- PGMQ (PostgreSQL Message Queue) FUNCTIONS - pgmq schema
-- ============================================================================

-- 1. pgmq.create
-- Purpose: Creates a new message queue
-- Usage: supabase.rpc('pgmq.create', { queue_name: string })
-- Returns: void
-- Used in: setup-enhanced-pgmq.js
-- Note: Previously referenced as pgmq_create

-- 2. pgmq.create_unlogged
-- Purpose: Creates an unlogged queue (faster but not crash-safe)
-- Usage: supabase.rpc('pgmq.create_unlogged', { queue_name: string })
-- Returns: void
-- Used in: EnhancedPGMQClient.ts

-- 3. pgmq.create_partitioned
-- Purpose: Creates a partitioned queue with retention policies
-- Usage: supabase.rpc('pgmq.create_partitioned', {
--   queue_name: string,
--   partition_interval: string,
--   retention_interval: string
-- })
-- Returns: void
-- Used in: EnhancedPGMQClient.ts

-- 4. pgmq.send
-- Purpose: Sends a single message to a queue
-- Usage: supabase.rpc('pgmq.send', {
--   queue_name: string,
--   msg: any,
--   delay: number
-- })
-- Alternative params: p_queue_name, p_message, p_delay_seconds
-- Returns: bigint (message ID)
-- Used in: EnhancedPGMQClient.ts, test-enhanced-pipeline.js

-- 5. pgmq.send_batch
-- Purpose: Sends multiple messages to a queue in one operation
-- Usage: supabase.rpc('pgmq.send_batch', {
--   queue_name: string,
--   msgs: any[],
--   delay: number
-- })
-- Returns: bigint[] (array of message IDs)
-- Used in: EnhancedPGMQClient.ts

-- 6. pgmq.read
-- Purpose: Reads messages from a queue without removing them
-- Usage: supabase.rpc('pgmq.read', {
--   queue_name: string,
--   vt: number,  // visibility timeout in seconds
--   qty: number   // quantity to read
-- })
-- Returns: array of { msg_id: bigint, read_ct: number, enqueued_at: timestamp, vt: timestamp, message: any }
-- Used in: PGMQService.ts, EnhancedPGMQClient.ts

-- 7. pgmq.read_with_poll
-- Purpose: Reads messages with long polling support
-- Usage: supabase.rpc('pgmq.read_with_poll', {
--   queue_name: string,
--   vt: number,
--   qty: number,
--   max_poll_seconds: number,
--   poll_interval_ms: number
-- })
-- Returns: Same as pgmq.read
-- Used in: EnhancedPGMQClient.ts

-- 8. pgmq.delete
-- Purpose: Deletes messages from a queue (single or batch)
-- Usage (single): supabase.rpc('pgmq.delete', { queue_name: string, msg_id: bigint })
-- Usage (batch): supabase.rpc('pgmq.delete', { queue_name: string, msg_ids: bigint[] })
-- Returns: boolean or bigint[] (deleted message IDs)
-- Used in: PGMQService.ts, EnhancedPGMQClient.ts

-- 9. pgmq.archive
-- Purpose: Archives messages to the archive table
-- Usage (single): supabase.rpc('pgmq.archive', { queue_name: string, msg_id: bigint })
-- Usage (batch): supabase.rpc('pgmq.archive', { queue_name: string, msg_ids: bigint[] })
-- Returns: boolean or bigint[] (archived message IDs)
-- Used in: EnhancedPGMQClient.ts

-- 10. pgmq.pop
-- Purpose: Reads and deletes a message in one atomic operation
-- Usage: supabase.rpc('pgmq.pop', { queue_name: string })
-- Returns: Same structure as pgmq.read but single message
-- Used in: None currently (available for use)

-- 11. pgmq.set_vt
-- Purpose: Updates the visibility timeout of a message
-- Usage: supabase.rpc('pgmq.set_vt', {
--   queue_name: string,
--   msg_id: bigint,
--   vt_offset: number  // seconds to add to current time
-- })
-- Returns: { msg_id: bigint, read_ct: number, enqueued_at: timestamp, vt: timestamp, message: any }
-- Used in: None currently (available for use)

-- 12. pgmq.purge_queue
-- Purpose: Removes all messages from a queue
-- Usage: supabase.rpc('pgmq.purge_queue', { queue_name: string })
-- Returns: bigint (number of messages purged)
-- Used in: EnhancedPGMQClient.ts

-- 13. pgmq.drop_queue
-- Purpose: Deletes a queue and all its messages
-- Usage: supabase.rpc('pgmq.drop_queue', { queue_name: string })
-- Returns: boolean
-- Used in: test scripts, cleanup operations

-- 14. pgmq.list_queues
-- Purpose: Lists all existing queues
-- Usage: supabase.rpc('pgmq.list_queues', {})
-- Returns: array of queue names
-- Used in: EnhancedPGMQClient.ts

-- 15. pgmq.metrics
-- Purpose: Gets metrics for a specific queue
-- Usage: supabase.rpc('pgmq.metrics', { queue_name: string })
-- Returns: { queue_name, queue_length, oldest_msg_age_sec, newest_msg_age_sec, total_messages }
-- Used in: EnhancedPGMQClient.ts

-- 16. pgmq.metrics_all
-- Purpose: Gets metrics for all queues
-- Usage: supabase.rpc('pgmq.metrics_all', {})
-- Returns: array of queue metrics
-- Used in: EnhancedPGMQClient.ts, health monitoring

-- ============================================================================
-- ENHANCED JOB TRACKING FUNCTIONS - public schema
-- ============================================================================

-- 17. enqueue_enhanced_job
-- Purpose: Enqueues a job with enhanced tracking
-- Usage: supabase.rpc('enqueue_enhanced_job', {
--   p_queue_name: string,
--   p_job_type: string,
--   p_payload: any
-- })
-- Alternative params: queue_name, job_type, payload
-- Returns: bigint (message ID)
-- Used in: test-enhanced-pipeline.js

-- 18. mark_enhanced_job_started
-- Purpose: Marks a job as started in enhanced tracking
-- Usage: supabase.rpc('mark_enhanced_job_started', {
--   p_message_id: bigint,
--   p_queue_name: string
-- })
-- Returns: void
-- Used in: Worker processes

-- 19. mark_enhanced_job_completed
-- Purpose: Marks a job as completed in enhanced tracking
-- Usage: supabase.rpc('mark_enhanced_job_completed', {
--   p_message_id: bigint,
--   p_queue_name: string
-- })
-- Returns: void
-- Used in: Worker processes

-- 20. mark_enhanced_job_failed
-- Purpose: Marks a job as failed with error details
-- Usage: supabase.rpc('mark_enhanced_job_failed', {
--   p_message_id: bigint,
--   p_queue_name: string,
--   p_error_message: string
-- })
-- Returns: void
-- Used in: Worker processes

-- 21. cleanup_enhanced_job_tracking
-- Purpose: Removes old job tracking records
-- Usage: supabase.rpc('cleanup_enhanced_job_tracking', { p_days_to_keep: number })
-- Returns: bigint (number of records deleted)
-- Used in: Maintenance scripts

-- 22. get_enhanced_queue_health
-- Purpose: Gets health status of enhanced queues
-- Usage: supabase.rpc('get_enhanced_queue_health', {})
-- Returns: array of queue health metrics
-- Used in: Health monitoring

-- ============================================================================
-- SEARCH & VECTOR FUNCTIONS - public schema
-- ============================================================================

-- 23. search_similar_chunks
-- Purpose: Performs vector similarity search
-- Usage: supabase.rpc('search_similar_chunks', {
--   query_embedding: number[],  // 1536-dimensional vector
--   match_threshold: number,    // similarity threshold (0-1)
--   match_count: number,        // max results
--   filter: any                 // optional filters
-- })
-- Returns: array of chunks with similarity scores
-- Used in: VectorEmbeddingService.ts

-- 24. hybrid_search
-- Purpose: Combines vector and keyword search
-- Usage: supabase.rpc('hybrid_search', {
--   search_query: string,
--   query_embedding: number[],
--   course_ids: string[],
--   match_count: number,
--   keyword_weight: number,
--   semantic_weight: number
-- })
-- Returns: array of search results with combined scores
-- Used in: HybridSearchService.ts

-- 25. keyword_search
-- Purpose: Performs full-text search on chunks
-- Usage: supabase.rpc('keyword_search', {
--   search_query: string,
--   course_ids: string[],
--   match_count: number
-- })
-- Returns: array of chunks with text match scores
-- Used in: EnhancedSearchService.ts

-- 26. refresh_search_index
-- Purpose: Refreshes the materialized search index view
-- Usage: supabase.rpc('refresh_search_index', {})
-- Returns: void
-- Used in: After bulk file processing

-- ============================================================================
-- LEGACY JOB TRACKING FUNCTIONS - public schema
-- ============================================================================

-- 27. track_job_started
-- Purpose: Legacy job tracking - marks job as started
-- Usage: supabase.rpc('track_job_started', {
--   p_queue_name: string,
--   p_job_id: bigint,
--   p_job_type: string,
--   p_job_data: jsonb
-- })
-- Returns: void
-- Used in: PGMQService.ts (legacy system)

-- 28. track_job_completed
-- Purpose: Legacy job tracking - marks job as completed
-- Usage: supabase.rpc('track_job_completed', {
--   p_queue_name: string,
--   p_job_id: bigint,
--   p_result_data: jsonb
-- })
-- Returns: void
-- Used in: PGMQService.ts (legacy system)

-- 29. track_job_failed
-- Purpose: Legacy job tracking - marks job as failed
-- Usage: supabase.rpc('track_job_failed', {
--   p_queue_name: string,
--   p_job_id: bigint,
--   p_error_message: text,
--   p_error_data: jsonb
-- })
-- Returns: void
-- Used in: PGMQService.ts (legacy system)

-- 30. get_queue_metrics
-- Purpose: Legacy wrapper for queue metrics
-- Usage: supabase.rpc('get_queue_metrics', {})
-- Returns: array of queue metrics
-- Used in: PGMQService.ts (legacy system)

-- ============================================================================
-- UTILITY FUNCTIONS - public schema
-- ============================================================================

-- 31. reorder_modules
-- Purpose: Reorders modules within a course
-- Usage: supabase.rpc('reorder_modules', { module_ids: string[] })
-- Returns: void
-- Used in: moduleService.ts

-- 32. pgmq_create_enhanced
-- Purpose: Creates queue with enhanced configuration
-- Usage: supabase.rpc('pgmq_create_enhanced', {
--   queue_name: string,
--   queue_type: string,
--   partition_interval?: string,
--   retention_interval?: string
-- })
-- Returns: void
-- Used in: Migration scripts

-- ============================================================================
-- COMMON PATTERNS & NOTES
-- ============================================================================

-- Schema Resolution:
-- - PGMQ functions: Use 'pgmq.function_name' 
-- - Public functions: Use just 'function_name' or 'public.function_name'
-- - Always check error.hint if function not found - it often suggests the correct name

-- Parameter Naming:
-- - Some functions accept both styles: queue_name or p_queue_name
-- - Enhanced functions typically use p_ prefix
-- - PGMQ core functions use simple names

-- Return Types:
-- - Message IDs are returned as bigint (handle as string in JavaScript)
-- - Batch operations return arrays
-- - Metrics return JSONB objects

-- Error Handling:
-- - Check for both data and error in response
-- - PGMQ functions may return null on success
-- - Use try-catch for RPC calls

-- ============================================================================