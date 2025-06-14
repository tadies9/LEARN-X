-- Migration to set up hybrid search capabilities
-- This adds text search, improves vector search, and creates necessary indexes

-- Enable full-text search extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add text search configuration for better keyword matching
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'sectionTitle', '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'keywords', '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'concepts', '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS update_search_vector_trigger ON file_chunks;
CREATE TRIGGER update_search_vector_trigger
BEFORE INSERT OR UPDATE OF content, metadata ON file_chunks
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();

-- Update existing chunks
UPDATE file_chunks
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(metadata->>'sectionTitle', '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(metadata->>'keywords', '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(metadata->>'concepts', '')), 'C');

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_file_chunks_search_vector ON file_chunks USING GIN (search_vector);

-- Create additional indexes for hybrid search
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id_chunk_index ON file_chunks(file_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_file_chunks_created_at ON file_chunks(created_at);
CREATE INDEX IF NOT EXISTS idx_course_files_module_id ON course_files(module_id);
CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON course_files(course_id);

-- Improve the search_file_chunks function to include more metadata
CREATE OR REPLACE FUNCTION search_file_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id as chunk_id,
    fc.file_id,
    cf.name as file_name,
    fc.content,
    fc.chunk_index,
    fc.chunk_type,
    fc.importance,
    fc.section_title,
    fc.metadata->'concepts' as concepts,
    fc.metadata->'keywords' as keywords,
    1 - (fe.embedding <=> query_embedding) as similarity,
    cf.course_id,
    cf.module_id,
    cf.mime_type
  FROM file_embeddings fe
  JOIN file_chunks fc ON fe.chunk_id = fc.id
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE 1 - (fe.embedding <=> query_embedding) > match_threshold
    AND (p_user_id IS NULL OR c.user_id = p_user_id)
    AND (p_course_id IS NULL OR cf.course_id = p_course_id)
    AND (p_module_id IS NULL OR cf.module_id = p_module_id)
    AND (p_file_types IS NULL OR cf.mime_type = ANY(p_file_types))
    AND (p_chunk_types IS NULL OR fc.chunk_type = ANY(p_chunk_types))
    AND (p_importance IS NULL OR fc.importance = ANY(p_importance))
    AND cf.status = 'completed'
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create function for keyword search using full-text search
CREATE OR REPLACE FUNCTION search_chunks_by_keyword(
  search_query text,
  match_count int,
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
  rank float,
  course_id uuid,
  module_id uuid,
  mime_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id as chunk_id,
    fc.file_id,
    cf.name as file_name,
    fc.content,
    fc.chunk_index,
    fc.chunk_type,
    fc.importance,
    fc.section_title,
    fc.metadata->'concepts' as concepts,
    fc.metadata->'keywords' as keywords,
    ts_rank(fc.search_vector, websearch_to_tsquery('english', search_query)) as rank,
    cf.course_id,
    cf.module_id,
    cf.mime_type
  FROM file_chunks fc
  JOIN course_files cf ON fc.file_id = cf.id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE fc.search_vector @@ websearch_to_tsquery('english', search_query)
    AND (p_user_id IS NULL OR c.user_id = p_user_id)
    AND (p_course_id IS NULL OR cf.course_id = p_course_id)
    AND (p_module_id IS NULL OR cf.module_id = p_module_id)
    AND (p_file_types IS NULL OR cf.mime_type = ANY(p_file_types))
    AND (p_chunk_types IS NULL OR fc.chunk_type = ANY(p_chunk_types))
    AND (p_importance IS NULL OR fc.importance = ANY(p_importance))
    AND cf.status = 'completed'
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Create materialized view for search performance (optional - for very large datasets)
-- This can be refreshed periodically to improve search performance
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index AS
SELECT 
  fc.id as chunk_id,
  fc.file_id,
  fc.content,
  fc.chunk_index,
  fc.chunk_type,
  fc.importance,
  fc.section_title,
  fc.metadata,
  fc.search_vector,
  cf.name as file_name,
  cf.course_id,
  cf.module_id,
  cf.mime_type,
  cf.status as file_status,
  c.user_id,
  fe.embedding
FROM file_chunks fc
JOIN course_files cf ON fc.file_id = cf.id
JOIN modules m ON cf.module_id = m.id
JOIN courses c ON m.course_id = c.id
LEFT JOIN file_embeddings fe ON fe.chunk_id = fc.id
WHERE cf.status = 'completed';

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_search_index_user_id ON search_index(user_id);
CREATE INDEX IF NOT EXISTS idx_search_index_course_id ON search_index(course_id);
CREATE INDEX IF NOT EXISTS idx_search_index_module_id ON search_index(module_id);
CREATE INDEX IF NOT EXISTS idx_search_index_search_vector ON search_index USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_embedding ON search_index USING ivfflat (embedding vector_cosine_ops);

-- Function to refresh search index
CREATE OR REPLACE FUNCTION refresh_search_index() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_index;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION search_file_chunks IS 'Vector similarity search with filtering support';
COMMENT ON FUNCTION search_chunks_by_keyword IS 'Full-text keyword search with filtering support';
COMMENT ON MATERIALIZED VIEW search_index IS 'Cached search index for improved performance';
COMMENT ON FUNCTION refresh_search_index IS 'Refreshes the search index materialized view';