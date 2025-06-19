-- SQL functions for Supabase monitoring
-- Run these in your Supabase SQL editor to enable monitoring

-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database());
$$;

-- Function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  schemaname text,
  tablename text,
  size_bytes bigint,
  size_pretty text,
  row_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname::text,
    tablename::text,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
    COALESCE(n_tup_ins + n_tup_upd + n_tup_del, 0) as row_count
  FROM pg_tables pt
  LEFT JOIN pg_stat_user_tables psut ON pt.tablename = psut.relname AND pt.schemaname = psut.schemaname
  WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
$$;

-- Function to get current connections
CREATE OR REPLACE FUNCTION get_current_connections()
RETURNS TABLE(
  application_name text,
  client_addr inet,
  state text,
  query_start timestamptz,
  state_change timestamptz,
  backend_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    application_name::text,
    client_addr,
    state::text,
    query_start,
    state_change,
    backend_type::text
  FROM pg_stat_activity
  WHERE state IS NOT NULL
    AND backend_type = 'client backend';
$$;

-- Function to get connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE(
  application_name text,
  connection_count bigint,
  active_count bigint,
  idle_count bigint,
  avg_duration_minutes numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(application_name, 'unknown')::text,
    COUNT(*) as connection_count,
    COUNT(*) FILTER (WHERE state = 'active') as active_count,
    COUNT(*) FILTER (WHERE state = 'idle') as idle_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - backend_start)) / 60), 2) as avg_duration_minutes
  FROM pg_stat_activity
  WHERE backend_type = 'client backend'
  GROUP BY application_name
  ORDER BY connection_count DESC;
$$;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint,
  size_bytes bigint,
  size_pretty text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname::text,
    tablename::text,
    indexname::text,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_relation_size(indexrelid) as size_bytes,
    pg_size_pretty(pg_relation_size(indexrelid)) as size_pretty
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;
$$;

-- Function to get unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  size_bytes bigint,
  size_pretty text,
  definition text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    stat.schemaname::text,
    stat.tablename::text,
    stat.indexname::text,
    pg_relation_size(stat.indexrelid) as size_bytes,
    pg_size_pretty(pg_relation_size(stat.indexrelid)) as size_pretty,
    pg_get_indexdef(stat.indexrelid) as definition
  FROM pg_stat_user_indexes stat
  JOIN pg_index idx ON stat.indexrelid = idx.indexrelid
  WHERE stat.idx_scan = 0
    AND NOT idx.indisunique
    AND NOT idx.indisprimary
    AND pg_relation_size(stat.indexrelid) > 1024 * 1024 -- Only show indexes > 1MB
  ORDER BY pg_relation_size(stat.indexrelid) DESC;
$$;

-- Function to get suggested indexes (simplified version)
CREATE OR REPLACE FUNCTION get_suggested_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  reason text,
  estimated_benefit text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH missing_indexes AS (
    SELECT 
      tablename as table_name,
      'multiple_columns' as column_name,
      'High sequential scan ratio' as reason,
      'High' as estimated_benefit
    FROM pg_stat_user_tables
    WHERE seq_scan > idx_scan * 10
      AND n_tup_ins + n_tup_upd + n_tup_del > 1000
  )
  SELECT * FROM missing_indexes
  LIMIT 20;
$$;

-- Function to get slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries(min_duration numeric DEFAULT 1000)
RETURNS TABLE(
  query text,
  calls bigint,
  total_exec_time numeric,
  mean_exec_time numeric,
  rows_returned bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    substr(query, 1, 200) as query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows as rows_returned
  FROM pg_stat_statements
  WHERE mean_exec_time > min_duration
  ORDER BY mean_exec_time DESC
  LIMIT 50;
$$;

-- Function to get lock statistics
CREATE OR REPLACE FUNCTION get_lock_stats()
RETURNS TABLE(
  lock_type text,
  mode_name text,
  count bigint,
  waits bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    locktype::text as lock_type,
    mode::text as mode_name,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE NOT granted) as waits
  FROM pg_locks
  GROUP BY locktype, mode
  ORDER BY waits DESC, count DESC;
$$;

-- Function to get cache hit ratio
CREATE OR REPLACE FUNCTION get_cache_hit_ratio()
RETURNS TABLE(
  ratio numeric,
  heap_read bigint,
  heap_hit bigint,
  idx_read bigint,
  idx_hit bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ROUND(
      (sum(heap_blks_hit) + sum(idx_blks_hit)) * 100.0 / 
      GREATEST(sum(heap_blks_hit) + sum(heap_blks_read) + sum(idx_blks_hit) + sum(idx_blks_read), 1), 
      4
    ) as ratio,
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(idx_blks_read) as idx_read,
    sum(idx_blks_hit) as idx_hit
  FROM pg_statio_user_tables;
$$;

-- Function to analyze query performance over time
CREATE OR REPLACE FUNCTION get_query_performance_trends()
RETURNS TABLE(
  hour_bucket timestamptz,
  avg_query_time numeric,
  total_queries bigint,
  slow_query_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    date_trunc('hour', query_start) as hour_bucket,
    AVG(EXTRACT(EPOCH FROM (state_change - query_start)) * 1000) as avg_query_time,
    COUNT(*) as total_queries,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (state_change - query_start)) > 1) as slow_query_count
  FROM pg_stat_activity
  WHERE query_start IS NOT NULL 
    AND state_change IS NOT NULL
    AND query_start > NOW() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', query_start)
  ORDER BY hour_bucket DESC;
$$;

-- Function to get storage breakdown by schema
CREATE OR REPLACE FUNCTION get_storage_by_schema()
RETURNS TABLE(
  schema_name text,
  table_count bigint,
  total_size_bytes bigint,
  total_size_pretty text,
  avg_table_size_bytes bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname::text as schema_name,
    COUNT(*) as table_count,
    SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size_bytes,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_size_pretty,
    AVG(pg_total_relation_size(schemaname||'.'||tablename))::bigint as avg_table_size_bytes
  FROM pg_tables
  WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  GROUP BY schemaname
  ORDER BY total_size_bytes DESC;
$$;

-- Function to get recent database activity
CREATE OR REPLACE FUNCTION get_recent_activity()
RETURNS TABLE(
  activity_type text,
  table_name text,
  operations_count bigint,
  last_activity timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    'INSERT' as activity_type,
    relname::text as table_name,
    n_tup_ins as operations_count,
    COALESCE(last_autoanalyze, last_analyze, last_vacuum) as last_activity
  FROM pg_stat_user_tables
  WHERE n_tup_ins > 0
  UNION ALL
  SELECT 
    'UPDATE' as activity_type,
    relname::text as table_name,
    n_tup_upd as operations_count,
    COALESCE(last_autoanalyze, last_analyze, last_vacuum) as last_activity
  FROM pg_stat_user_tables
  WHERE n_tup_upd > 0
  UNION ALL
  SELECT 
    'DELETE' as activity_type,
    relname::text as table_name,
    n_tup_del as operations_count,
    COALESCE(last_autoanalyze, last_analyze, last_vacuum) as last_activity
  FROM pg_stat_user_tables
  WHERE n_tup_del > 0
  ORDER BY operations_count DESC;
$$;

-- Grant execute permissions (adjust role as needed)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Note: Some functions require the pg_stat_statements extension
-- Enable it with: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;