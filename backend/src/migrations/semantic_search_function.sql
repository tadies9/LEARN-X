-- Function for semantic search using pgvector
CREATE OR REPLACE FUNCTION search_chunks_by_embedding(
  query_embedding vector(1536),
  file_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id AS chunk_id,
    fc.content,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    fc.metadata
  FROM chunk_embeddings ce
  JOIN file_chunks fc ON ce.chunk_id = fc.id
  WHERE 
    ce.file_id = file_id
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_vector 
ON chunk_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);