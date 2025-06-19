-- Advanced pgbench script for hybrid search performance testing
-- Tests vector + keyword search with new indexes and query patterns

\set user_id '''b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'''::uuid
\set search_type random(1, 6)
\set keyword_pool random(1, 20)

-- Define search keywords pool (simulate real search terms)
\set search_term CASE :keyword_pool 
  WHEN 1 THEN 'machine learning'
  WHEN 2 THEN 'data science'
  WHEN 3 THEN 'neural networks'
  WHEN 4 THEN 'algorithm'
  WHEN 5 THEN 'programming'
  WHEN 6 THEN 'database'
  WHEN 7 THEN 'software engineering'
  WHEN 8 THEN 'artificial intelligence'
  WHEN 9 THEN 'deep learning'
  WHEN 10 THEN 'computer vision'
  WHEN 11 THEN 'natural language'
  WHEN 12 THEN 'optimization'
  WHEN 13 THEN 'statistics'
  WHEN 14 THEN 'mathematics'
  WHEN 15 THEN 'python'
  WHEN 16 THEN 'typescript'
  WHEN 17 THEN 'react'
  WHEN 18 THEN 'performance'
  WHEN 19 THEN 'scalability'
  ELSE 'technology'
END

-- Test 1: Pure vector similarity search with index usage (25%)
\if :search_type == 1
  WITH search_vector AS (
    SELECT array_agg(
      (random() - 0.5) * 1.5  -- Realistic embedding distribution
    )::vector(1536) as embedding
    FROM generate_series(1, 1536)
  )
  SELECT 
    fc.id,
    fc.content,
    fc.chunk_type,
    fc.importance,
    (fc.embedding <=> sv.embedding) as distance,
    1 - (fc.embedding <=> sv.embedding) as similarity
  FROM file_chunks fc
  CROSS JOIN search_vector sv
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = :user_id
    AND fc.embedding IS NOT NULL
    AND fc.importance IN ('high', 'medium')
  ORDER BY fc.embedding <=> sv.embedding
  LIMIT 15;
\fi

-- Test 2: Hybrid search with text + vector (20%)
\if :search_type == 2
  WITH search_vector AS (
    SELECT array_agg(
      CASE 
        WHEN i % 100 = 0 THEN 0.0  -- Sparse elements
        ELSE (random() - 0.5) * 2.0
      END
    )::vector(1536) as embedding
    FROM generate_series(1, 1536) i
  ),
  text_matches AS (
    SELECT fc.id, fc.embedding,
           ts_rank(to_tsvector('english', fc.content), plainto_tsquery(:search_term)) as text_rank
    FROM file_chunks fc
    JOIN course_files cf ON fc.file_id = cf.id
    JOIN modules m ON cf.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = :user_id
      AND fc.embedding IS NOT NULL
      AND to_tsvector('english', fc.content) @@ plainto_tsquery(:search_term)
  )
  SELECT 
    tm.id,
    tm.text_rank,
    (tm.embedding <=> sv.embedding) as vector_distance,
    -- Hybrid score: 70% vector similarity + 30% text relevance
    (0.7 * (1 - (tm.embedding <=> sv.embedding)) + 0.3 * tm.text_rank) as hybrid_score
  FROM text_matches tm
  CROSS JOIN search_vector sv
  WHERE tm.text_rank > 0
  ORDER BY hybrid_score DESC
  LIMIT 10;
\fi

-- Test 3: Filtered vector search with metadata (20%)
\if :search_type == 3
  WITH filtered_vector AS (
    SELECT array_agg(
      random_normal()::float4  -- Normal distribution
    )::vector(1536) as embedding
    FROM generate_series(1, 1536)
  )
  SELECT 
    fc.id,
    fc.chunk_type,
    fc.importance,
    fc.metadata ->> 'concepts' as concepts,
    (fc.embedding <=> fv.embedding) as distance
  FROM file_chunks fc
  CROSS JOIN filtered_vector fv
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = :user_id
    AND fc.embedding IS NOT NULL
    AND fc.chunk_type = 'content'
    AND fc.metadata ? 'concepts'  -- Has concepts metadata
    AND jsonb_array_length(fc.metadata -> 'concepts') > 0
  ORDER BY fc.embedding <=> fv.embedding
  LIMIT 12;
\fi

-- Test 4: Aggregated search results by course (15%)
\if :search_type == 4
  WITH course_search AS (
    SELECT array_agg(
      (random() - 0.5) * 1.8
    )::vector(1536) as embedding
    FROM generate_series(1, 1536)
  )
  SELECT 
    c.id as course_id,
    c.title as course_title,
    COUNT(fc.id) as matching_chunks,
    AVG(fc.embedding <=> cs.embedding) as avg_distance,
    MIN(fc.embedding <=> cs.embedding) as best_match_distance,
    COUNT(CASE WHEN fc.importance = 'high' THEN 1 END) as high_importance_matches
  FROM courses c
  JOIN modules m ON c.id = m.course_id
  JOIN course_files cf ON m.id = cf.module_id
  JOIN file_chunks fc ON cf.id = fc.file_id
  CROSS JOIN course_search cs
  WHERE c.user_id = :user_id
    AND fc.embedding IS NOT NULL
    AND fc.embedding <=> cs.embedding < 0.8  -- Similarity threshold
  GROUP BY c.id, c.title
  HAVING COUNT(fc.id) >= 2
  ORDER BY avg_distance ASC
  LIMIT 8;
\fi

-- Test 5: Multi-vector search simulation (10%)
\if :search_type == 5
  WITH multi_vectors AS (
    SELECT 
      1 as vector_id,
      array_agg((random() - 0.5) * 2.0)::vector(1536) as embedding
    FROM generate_series(1, 1536)
    UNION ALL
    SELECT 
      2 as vector_id,
      array_agg((random() - 0.3) * 1.5)::vector(1536) as embedding
    FROM generate_series(1, 1536)
  ),
  best_matches AS (
    SELECT 
      fc.id,
      fc.content,
      MIN(fc.embedding <=> mv.embedding) as best_distance,
      MIN(mv.vector_id) as best_vector_id
    FROM file_chunks fc
    JOIN course_files cf ON fc.file_id = cf.id
    JOIN modules m ON cf.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    CROSS JOIN multi_vectors mv
    WHERE c.user_id = :user_id
      AND fc.embedding IS NOT NULL
    GROUP BY fc.id, fc.content
    HAVING MIN(fc.embedding <=> mv.embedding) < 0.7
  )
  SELECT 
    id,
    best_distance,
    best_vector_id,
    CASE 
      WHEN best_distance < 0.3 THEN 'excellent'
      WHEN best_distance < 0.5 THEN 'good'
      ELSE 'fair'
    END as match_quality
  FROM best_matches
  ORDER BY best_distance ASC
  LIMIT 20;
\fi

-- Test 6: Performance stress test with large result sets (10%)
\if :search_type == 6
  WITH stress_vector AS (
    SELECT array_agg(
      CASE 
        WHEN i <= 512 THEN random()::float4
        WHEN i <= 1024 THEN (random() - 0.5)::float4
        ELSE (random() - 0.8)::float4
      END
    )::vector(1536) as embedding
    FROM generate_series(1, 1536) i
  )
  SELECT 
    fc.id,
    fc.chunk_type,
    (fc.embedding <=> sv.embedding) as distance,
    LENGTH(fc.content) as content_length,
    fc.metadata ->> 'processing_time' as processing_time
  FROM file_chunks fc
  CROSS JOIN stress_vector sv
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = :user_id
    AND fc.embedding IS NOT NULL
    AND fc.embedding <=> sv.embedding < 1.0  -- Very lenient threshold
  ORDER BY fc.embedding <=> sv.embedding
  LIMIT 100;  -- Large result set
\fi