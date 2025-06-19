-- Create functions for pgvector monitoring and statistics

-- Function to get pgvector index statistics
CREATE OR REPLACE FUNCTION get_pgvector_index_stats()
RETURNS TABLE (
  index_name TEXT,
  table_name TEXT,
  total_vectors BIGINT,
  index_size_bytes BIGINT,
  dimensions INTEGER,
  fragmentation_ratio FLOAT,
  last_vacuum TIMESTAMPTZ,
  last_analyze TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH index_info AS (
    SELECT 
      i.indexname as idx_name,
      i.tablename as tbl_name,
      pg_relation_size(c.oid) as idx_size,
      s.n_live_tup as live_tuples,
      s.last_vacuum,
      s.last_analyze
    FROM pg_indexes i
    JOIN pg_class c ON c.relname = i.indexname
    JOIN pg_stat_user_tables s ON s.relname = i.tablename
    WHERE i.indexdef LIKE '%USING ivfflat%'
       OR i.indexdef LIKE '%USING hnsw%'
  ),
  vector_info AS (
    SELECT 
      COUNT(*) as vector_count,
      1536 as dims -- Hardcoded for now, adjust based on your setup
    FROM file_embeddings
  )
  SELECT 
    ii.idx_name,
    ii.tbl_name,
    vi.vector_count,
    ii.idx_size,
    vi.dims,
    CASE 
      WHEN ii.live_tuples > 0 THEN 
        1.0 - (vi.vector_count::float / ii.live_tuples::float)
      ELSE 0
    END as frag_ratio,
    ii.last_vacuum,
    ii.last_analyze
  FROM index_info ii
  CROSS JOIN vector_info vi;
END;
$$ LANGUAGE plpgsql;

-- Function to get pgvector memory statistics
CREATE OR REPLACE FUNCTION get_pgvector_memory_stats()
RETURNS TABLE (
  stat_name TEXT,
  value NUMERIC,
  unit TEXT,
  memory_usage_mb FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH buffer_stats AS (
    SELECT 
      n.nspname,
      c.relname,
      count(*) * 8192.0 / 1024 / 1024 as buffer_mb
    FROM pg_buffercache b
    JOIN pg_class c ON b.relfilenode = pg_relation_filenode(c.oid)
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname IN ('file_embeddings', 'file_embeddings_embedding_idx')
    GROUP BY n.nspname, c.relname
  )
  SELECT 
    'buffer_cache_usage' as stat_name,
    COALESCE(SUM(buffer_mb), 0) as value,
    'MB' as unit,
    COALESCE(SUM(buffer_mb), 0) as memory_usage_mb
  FROM buffer_stats
  
  UNION ALL
  
  SELECT 
    'shared_memory_size' as stat_name,
    current_setting('shared_buffers')::NUMERIC as value,
    'blocks' as unit,
    (current_setting('shared_buffers')::NUMERIC * 8192.0 / 1024 / 1024) as memory_usage_mb;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze vector search query performance
CREATE OR REPLACE FUNCTION analyze_vector_search_performance(
  sample_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  query_pattern TEXT,
  avg_execution_time_ms FLOAT,
  min_execution_time_ms FLOAT,
  max_execution_time_ms FLOAT,
  total_calls BIGINT,
  vectors_scanned_avg FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN query LIKE '%search_similar_chunks%' THEN 'similarity_search'
      WHEN query LIKE '%<=>%' THEN 'cosine_distance'
      WHEN query LIKE '%<->%' THEN 'l2_distance'
      WHEN query LIKE '%<#>%' THEN 'inner_product'
      ELSE 'other_vector_op'
    END as query_pattern,
    AVG(mean_exec_time) as avg_exec_time,
    MIN(min_exec_time) as min_exec_time,
    MAX(max_exec_time) as max_exec_time,
    SUM(calls) as total_calls,
    AVG(rows) as avg_vectors_scanned
  FROM pg_stat_statements
  WHERE query LIKE '%embedding%'
    AND query NOT LIKE '%pg_stat_statements%'
  GROUP BY 
    CASE 
      WHEN query LIKE '%search_similar_chunks%' THEN 'similarity_search'
      WHEN query LIKE '%<=>%' THEN 'cosine_distance'
      WHEN query LIKE '%<->%' THEN 'l2_distance'
      WHEN query LIKE '%<#>%' THEN 'inner_product'
      ELSE 'other_vector_op'
    END
  ORDER BY avg_exec_time DESC
  LIMIT sample_size;
END;
$$ LANGUAGE plpgsql;

-- Function to get vector distribution statistics
CREATE OR REPLACE FUNCTION get_vector_distribution_stats()
RETURNS TABLE (
  file_id UUID,
  chunk_count INTEGER,
  avg_vector_magnitude FLOAT,
  vector_variance FLOAT,
  has_zero_vectors BOOLEAN,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_stats AS (
    SELECT 
      fc.file_id,
      COUNT(*) as chunks,
      AVG(sqrt(sum(val * val))) as avg_magnitude,
      VARIANCE(sqrt(sum(val * val))) as var_magnitude,
      bool_or(sqrt(sum(val * val)) < 0.01) as has_zeros,
      MAX(fe.created_at) as last_update
    FROM file_embeddings fe
    JOIN file_chunks fc ON fc.id = fe.chunk_id
    CROSS JOIN LATERAL unnest(fe.embedding) as val
    GROUP BY fc.file_id, fe.chunk_id
  )
  SELECT 
    file_id,
    chunks::INTEGER,
    avg_magnitude,
    var_magnitude,
    has_zeros,
    last_update
  FROM vector_stats
  ORDER BY chunks DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to estimate optimal index parameters
CREATE OR REPLACE FUNCTION estimate_optimal_index_params(
  total_vectors BIGINT,
  target_recall FLOAT DEFAULT 0.95
)
RETURNS TABLE (
  index_type TEXT,
  recommended_lists INTEGER,
  recommended_probes INTEGER,
  estimated_build_time_minutes FLOAT,
  estimated_memory_mb FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'ivfflat' as index_type,
    GREATEST(16, LEAST(SQRT(total_vectors::FLOAT)::INTEGER, 1000)) as recommended_lists,
    CASE 
      WHEN target_recall >= 0.99 THEN 10
      WHEN target_recall >= 0.95 THEN 5
      WHEN target_recall >= 0.9 THEN 3
      ELSE 1
    END as recommended_probes,
    (total_vectors::FLOAT / 10000) as estimated_build_time_minutes,
    (total_vectors::FLOAT * 1536 * 4 / 1024 / 1024) * 1.2 as estimated_memory_mb
    
  UNION ALL
  
  SELECT 
    'hnsw' as index_type,
    16 as recommended_lists, -- m parameter for HNSW
    200 as recommended_probes, -- ef_construction for HNSW
    (total_vectors::FLOAT / 5000) as estimated_build_time_minutes,
    (total_vectors::FLOAT * 1536 * 4 / 1024 / 1024) * 2.5 as estimated_memory_mb;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pgvector_index_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pgvector_memory_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_vector_search_performance(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vector_distribution_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION estimate_optimal_index_params(BIGINT, FLOAT) TO authenticated;