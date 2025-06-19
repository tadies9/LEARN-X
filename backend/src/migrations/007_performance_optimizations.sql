-- Performance Optimization Migration
-- Adds missing indexes and optimizes existing queries

-- 1. Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_chunk_id ON file_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_file_id ON learning_sessions(file_id);

-- 2. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_course_files_module_course ON course_files(module_id, course_id);
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_status ON file_chunks(file_id, status);
CREATE INDEX IF NOT EXISTS idx_modules_course_order ON modules(course_id, order_index);

-- 3. Add indexes for search optimization
CREATE INDEX IF NOT EXISTS idx_file_chunks_importance ON file_chunks(importance);
CREATE INDEX IF NOT EXISTS idx_file_chunks_chunk_type ON file_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_course_files_mime_type ON course_files(mime_type);

-- 4. Optimize the search_file_chunks function
CREATE OR REPLACE FUNCTION search_file_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_module_id uuid DEFAULT NULL,
  p_file_types text[] DEFAULT NULL,
  p_chunk_types text[] DEFAULT NULL,
  p_importance text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  file_id uuid,
  file_name text,
  content text,
  chunk_index int,
  chunk_type text,
  importance text,
  section_title text,
  concepts jsonb,
  keywords jsonb,
  similarity float,
  course_id uuid,
  module_id uuid,
  mime_type text
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
  RETURN QUERY
  WITH eligible_files AS (
    -- Pre-filter files based on user access and filters
    SELECT DISTINCT cf.id, cf.name, cf.course_id, cf.module_id, cf.mime_type
    FROM course_files cf
    JOIN modules m ON cf.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE cf.status = 'completed'
      AND (p_user_id IS NULL OR c.user_id = p_user_id)
      AND (p_course_id IS NULL OR cf.course_id = p_course_id)
      AND (p_module_id IS NULL OR cf.module_id = p_module_id)
      AND (p_file_types IS NULL OR cf.mime_type = ANY(p_file_types))
  ),
  similarity_search AS (
    -- Perform vector similarity search
    SELECT 
      fe.chunk_id,
      1 - (fe.embedding <=> query_embedding) as similarity
    FROM file_embeddings fe
    JOIN file_chunks fc ON fe.chunk_id = fc.id
    JOIN eligible_files ef ON fc.file_id = ef.id
    WHERE 1 - (fe.embedding <=> query_embedding) > match_threshold
      AND (p_chunk_types IS NULL OR fc.chunk_type = ANY(p_chunk_types))
      AND (p_importance IS NULL OR fc.importance = ANY(p_importance))
    ORDER BY similarity DESC
    LIMIT match_count
  )
  SELECT 
    fc.id as chunk_id,
    fc.file_id,
    ef.name as file_name,
    fc.content,
    fc.chunk_index,
    fc.chunk_type,
    fc.importance,
    fc.section_title,
    fc.metadata->'concepts' as concepts,
    fc.metadata->'keywords' as keywords,
    ss.similarity,
    ef.course_id,
    ef.module_id,
    ef.mime_type
  FROM similarity_search ss
  JOIN file_chunks fc ON ss.chunk_id = fc.id
  JOIN eligible_files ef ON fc.file_id = ef.id
  ORDER BY ss.similarity DESC;
END;
$$;

-- 5. Create function for batch updating chunk metadata
CREATE OR REPLACE FUNCTION batch_update_chunk_metadata(
  chunk_updates jsonb[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  update_record jsonb;
BEGIN
  -- Create temporary table for batch updates
  CREATE TEMP TABLE temp_chunk_updates (
    chunk_id uuid,
    metadata jsonb,
    section_title text,
    chunk_type text,
    importance text
  ) ON COMMIT DROP;

  -- Insert all updates into temp table
  FOREACH update_record IN ARRAY chunk_updates
  LOOP
    INSERT INTO temp_chunk_updates (
      chunk_id,
      metadata,
      section_title,
      chunk_type,
      importance
    ) VALUES (
      (update_record->>'chunk_id')::uuid,
      update_record->'metadata',
      update_record->>'section_title',
      update_record->>'chunk_type',
      update_record->>'importance'
    );
  END LOOP;

  -- Perform batch update
  UPDATE file_chunks fc
  SET 
    metadata = COALESCE(tcu.metadata, fc.metadata),
    section_title = COALESCE(tcu.section_title, fc.section_title),
    chunk_type = COALESCE(tcu.chunk_type, fc.chunk_type),
    importance = COALESCE(tcu.importance, fc.importance),
    updated_at = NOW()
  FROM temp_chunk_updates tcu
  WHERE fc.id = tcu.chunk_id;
END;
$$;

-- 6. Create function for batch embedding updates
CREATE OR REPLACE FUNCTION batch_update_embeddings(
  embedding_updates jsonb[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  update_record jsonb;
BEGIN
  -- Use INSERT ON CONFLICT for efficient upserts
  FOREACH update_record IN ARRAY embedding_updates
  LOOP
    INSERT INTO file_embeddings (chunk_id, embedding, created_at)
    VALUES (
      (update_record->>'chunk_id')::uuid,
      (update_record->>'embedding')::vector(1536),
      NOW()
    )
    ON CONFLICT (chunk_id) 
    DO UPDATE SET 
      embedding = EXCLUDED.embedding,
      created_at = file_embeddings.created_at;
  END LOOP;
END;
$$;

-- 7. Create materialized view for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT c.id) as total_courses,
  COUNT(DISTINCT m.id) as total_modules,
  COUNT(DISTINCT cf.id) as total_files,
  COUNT(DISTINCT ls.id) as total_sessions,
  COALESCE(SUM(ls.duration_minutes), 0) as total_study_minutes,
  MAX(ls.last_accessed) as last_activity
FROM users u
LEFT JOIN courses c ON u.id = c.user_id
LEFT JOIN modules m ON c.id = m.course_id
LEFT JOIN course_files cf ON m.id = cf.module_id AND cf.status = 'completed'
LEFT JOIN learning_sessions ls ON u.id = ls.user_id
GROUP BY u.id;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_activity_summary_user_id ON user_activity_summary(user_id);

-- Function to refresh activity summary
CREATE OR REPLACE FUNCTION refresh_user_activity_summary() 
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
END;
$$;

-- 8. Add database function to check if pg_stat_statements is enabled
CREATE OR REPLACE FUNCTION check_pg_stat_statements()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_stat_statements'
  );
END;
$$;

-- 9. Add comments for documentation
COMMENT ON INDEX idx_file_chunks_file_id IS 'Foreign key index for file_chunks to course_files relationship';
COMMENT ON INDEX idx_file_embeddings_chunk_id IS 'Foreign key index for embeddings to chunks relationship';
COMMENT ON FUNCTION batch_update_chunk_metadata IS 'Efficiently update multiple chunk metadata records in a single transaction';
COMMENT ON FUNCTION batch_update_embeddings IS 'Efficiently upsert multiple embeddings in a single transaction';
COMMENT ON MATERIALIZED VIEW user_activity_summary IS 'Pre-computed user activity statistics for dashboard performance';