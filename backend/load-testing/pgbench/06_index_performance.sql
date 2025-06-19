-- pgbench script for testing index performance and query optimization
-- Tests various access patterns that should utilize database indexes

\set user_id '''b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'''::uuid
\set test_pattern random(1, 5)
\set time_range random(1, 4)

-- Dynamic time range selection
\set days_filter CASE :time_range
  WHEN 1 THEN 7    -- Last week
  WHEN 2 THEN 30   -- Last month  
  WHEN 3 THEN 90   -- Last quarter
  ELSE 365         -- Last year
END

-- Test 1: Index on user_id + created_at (compound index test)
\if :test_pattern == 1
  SELECT 
    c.id,
    c.title,
    c.created_at,
    COUNT(m.id) as module_count
  FROM courses c
  LEFT JOIN modules m ON c.id = m.course_id
  WHERE c.user_id = :user_id
    AND c.created_at >= NOW() - INTERVAL ':days_filter days'
    AND c.is_archived = false
  GROUP BY c.id, c.title, c.created_at
  ORDER BY c.created_at DESC;
\fi

-- Test 2: Vector index performance (HNSW index on embeddings)
\if :test_pattern == 2
  WITH random_query_vector AS (
    SELECT array_agg(random()::float4)::vector(1536) as embedding
    FROM generate_series(1, 1536)
  )
  SELECT 
    fc.id,
    fc.chunk_type,
    fc.importance,
    fc.embedding <-> rqv.embedding as l2_distance,
    fc.embedding <=> rqv.embedding as cosine_distance,
    fc.embedding <#> rqv.embedding as inner_product
  FROM file_chunks fc
  CROSS JOIN random_query_vector rqv
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = :user_id
    AND fc.embedding IS NOT NULL
  ORDER BY fc.embedding <=> rqv.embedding
  LIMIT 10;
\fi

-- Test 3: Full-text search index performance (GIN index)
\if :test_pattern == 3
  WITH search_terms AS (
    SELECT unnest(ARRAY[
      'machine learning', 'data science', 'algorithms',
      'programming', 'database design', 'system architecture'
    ]) as term
  )
  SELECT 
    fc.id,
    fc.content,
    fc.chunk_type,
    ts_rank(to_tsvector('english', fc.content), query) as rank,
    ts_headline('english', fc.content, query, 'MaxWords=20') as headline
  FROM file_chunks fc
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  CROSS JOIN (
    SELECT plainto_tsquery('english', st.term) as query
    FROM search_terms st
    ORDER BY RANDOM()
    LIMIT 1
  ) search
  WHERE c.user_id = :user_id
    AND to_tsvector('english', fc.content) @@ query
  ORDER BY rank DESC
  LIMIT 15;
\fi

-- Test 4: JSONB index performance (GIN index on metadata)
\if :test_pattern == 4
  SELECT 
    fc.id,
    fc.metadata,
    fc.importance,
    cf.name as file_name,
    fc.metadata -> 'concepts' as concepts,
    fc.metadata -> 'keywords' as keywords,
    jsonb_array_length(fc.metadata -> 'concepts') as concept_count
  FROM file_chunks fc
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = :user_id
    AND fc.metadata ? 'concepts'  -- Key existence check
    AND fc.metadata -> 'concepts' ? 'machine_learning'  -- Nested key check
    AND jsonb_array_length(fc.metadata -> 'concepts') > 2  -- Array length filter
    AND fc.metadata @> '{"importance": "high"}'::jsonb  -- Contains check
  ORDER BY 
    jsonb_array_length(fc.metadata -> 'concepts') DESC,
    fc.created_at DESC
  LIMIT 20;
\fi

-- Test 5: Multi-table join performance with composite indexes
\if :test_pattern == 5
  WITH file_stats AS (
    SELECT 
      cf.id as file_id,
      cf.name,
      cf.status,
      cf.size_bytes,
      cf.created_at,
      m.title as module_title,
      c.title as course_title,
      COUNT(fc.id) as chunk_count,
      COUNT(fe.chunk_id) as embedded_count,
      AVG(LENGTH(fc.content)) as avg_chunk_size,
      MAX(fc.updated_at) as last_chunk_update
    FROM course_files cf
    JOIN modules m ON cf.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    LEFT JOIN file_chunks fc ON cf.id = fc.file_id
    LEFT JOIN file_embeddings fe ON fc.id = fe.chunk_id
    WHERE c.user_id = :user_id
      AND cf.created_at >= NOW() - INTERVAL ':days_filter days'
      AND cf.status IN ('completed', 'processing')
    GROUP BY cf.id, cf.name, cf.status, cf.size_bytes, cf.created_at, 
             m.title, c.title
  )
  SELECT 
    file_id,
    name,
    status,
    size_bytes,
    chunk_count,
    embedded_count,
    CASE 
      WHEN chunk_count > 0 THEN (embedded_count::float / chunk_count * 100)
      ELSE 0 
    END as embedding_completion_percentage,
    avg_chunk_size,
    last_chunk_update,
    EXTRACT(EPOCH FROM NOW() - created_at) / 3600 as hours_since_upload
  FROM file_stats
  WHERE chunk_count > 0
  ORDER BY 
    embedding_completion_percentage DESC,
    hours_since_upload ASC
  LIMIT 25;
\fi