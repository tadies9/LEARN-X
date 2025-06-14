-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create new embeddings table with proper vector type
CREATE TABLE IF NOT EXISTS file_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES file_chunks(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimensions
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique embedding per chunk and model version
  CONSTRAINT unique_chunk_embedding UNIQUE(chunk_id, model_version)
);

-- Create indexes for performance
-- Using ivfflat for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS file_embeddings_embedding_idx 
  ON file_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for chunk lookups
CREATE INDEX IF NOT EXISTS file_embeddings_chunk_id_idx 
  ON file_embeddings(chunk_id);

-- Add metadata columns to file_chunks if they don't exist
ALTER TABLE file_chunks 
  ADD COLUMN IF NOT EXISTS chunk_metadata JSONB DEFAULT '{}';

ALTER TABLE file_chunks 
  ADD COLUMN IF NOT EXISTS chunk_type TEXT;

ALTER TABLE file_chunks 
  ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;

-- Add GIN index for JSONB metadata searches
CREATE INDEX IF NOT EXISTS file_chunks_metadata_gin_idx 
  ON file_chunks 
  USING gin(chunk_metadata);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_file_embeddings_updated_at 
  BEFORE UPDATE ON file_embeddings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy querying of chunks with embeddings
CREATE OR REPLACE VIEW chunks_with_embeddings AS
SELECT 
  fc.*,
  fe.embedding,
  fe.model_version,
  fe.created_at as embedding_created_at
FROM file_chunks fc
LEFT JOIN file_embeddings fe ON fc.id = fe.chunk_id;

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  file_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  chunk_metadata JSONB,
  similarity float,
  file_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id as chunk_id,
    fc.content,
    fc.chunk_metadata,
    1 - (fe.embedding <=> query_embedding) as similarity,
    fc.file_id
  FROM file_chunks fc
  JOIN file_embeddings fe ON fc.id = fe.chunk_id
  WHERE (file_id_filter IS NULL OR fc.file_id = file_id_filter)
  ORDER BY fe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;