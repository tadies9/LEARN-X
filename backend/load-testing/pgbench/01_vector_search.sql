-- Enhanced pgbench script for vector similarity search load testing
-- Tests search_file_chunks function with varied realistic scenarios

\set user_id '''b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'''::uuid
\set match_threshold random_gaussian(0.75, 0.1, 0.5, 0.95)
\set match_count random(5, 25)
\set scenario_type random(1, 4)

-- Scenario 1: Basic semantic search (40% of queries)
\if :scenario_type == 1
  WITH realistic_embedding AS (
    SELECT array_agg(
      CASE 
        WHEN generate_series % 10 = 0 THEN 0.0::float4  -- Add some zeros for sparsity
        ELSE (random() - 0.5) * 2.0  -- Range [-1, 1] like real embeddings
      END
    )::vector(1536) as embedding
    FROM generate_series(1, 1536)
  )
  SELECT 
    chunk_id,
    file_name,
    content,
    similarity,
    chunk_type,
    importance,
    metadata
  FROM search_file_chunks(
    (SELECT embedding FROM realistic_embedding),
    :match_threshold,
    :match_count,
    :user_id,
    NULL, -- course_id
    NULL, -- module_id
    NULL, -- file_types
    ARRAY['content', 'summary']::text[], -- chunk_types
    ARRAY['high', 'medium']::text[] -- importance
  );
\fi

-- Scenario 2: Course-filtered search (25% of queries)
\if :scenario_type == 2
  WITH realistic_embedding AS (
    SELECT array_agg(
      (random() - 0.5) * 2.0
    )::vector(1536) as embedding
    FROM generate_series(1, 1536)
  ),
  random_course AS (
    SELECT id FROM courses 
    WHERE user_id = :user_id 
    ORDER BY RANDOM() 
    LIMIT 1
  )
  SELECT 
    chunk_id,
    file_name,
    content,
    similarity,
    chunk_type,
    importance
  FROM search_file_chunks(
    (SELECT embedding FROM realistic_embedding),
    :match_threshold,
    :match_count,
    :user_id,
    (SELECT id FROM random_course), -- course_id
    NULL, -- module_id
    ARRAY['pdf', 'docx']::text[], -- file_types
    ARRAY['content']::text[], -- chunk_types
    ARRAY['high']::text[] -- importance
  );
\fi

-- Scenario 3: Hybrid search with keyword filtering (25% of queries)
\if :scenario_type == 3
  WITH realistic_embedding AS (
    SELECT array_agg(
      CASE 
        WHEN i <= 768 THEN random()::float4 * 0.8  -- First half more weighted
        ELSE random()::float4 * 0.3  -- Second half less weighted
      END
    )::vector(1536) as embedding
    FROM generate_series(1, 1536) i
  )
  SELECT 
    fc.id as chunk_id,
    cf.name as file_name,
    fc.content,
    (fc.embedding <=> (SELECT embedding FROM realistic_embedding)) as similarity,
    fc.chunk_type,
    fc.importance
  FROM file_chunks fc
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = :user_id
    AND fc.embedding IS NOT NULL
    AND fc.content ILIKE '%learn%'  -- Text filter
  ORDER BY fc.embedding <=> (SELECT embedding FROM realistic_embedding)
  LIMIT :match_count;
\fi

-- Scenario 4: Performance stress test (10% of queries) - large result set
\if :scenario_type == 4
  WITH high_variance_embedding AS (
    SELECT array_agg(
      random_normal()::float4  -- Use normal distribution
    )::vector(1536) as embedding
    FROM generate_series(1, 1536)
  )
  SELECT 
    chunk_id,
    file_name,
    similarity,
    chunk_type
  FROM search_file_chunks(
    (SELECT embedding FROM high_variance_embedding),
    0.3, -- Lower threshold for more results
    50, -- Higher result count
    :user_id,
    NULL,
    NULL,
    NULL,
    ARRAY['content', 'summary', 'outline']::text[],
    ARRAY['high', 'medium', 'low']::text[]
  )
  WHERE similarity > 0.4; -- Additional filter
\fi