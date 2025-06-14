-- Migration script to move existing embeddings from JSONB to vector format
-- This script handles the transition from the old storage format to pgvector

-- First, create a temporary function to migrate embeddings
CREATE OR REPLACE FUNCTION migrate_embeddings_to_vector()
RETURNS void AS $$
DECLARE
  chunk_record RECORD;
  embedding_array float[];
  embedding_vector vector(1536);
BEGIN
  -- Loop through all chunks that have embeddings in metadata
  FOR chunk_record IN 
    SELECT id, chunk_metadata
    FROM file_chunks
    WHERE chunk_metadata->>'embedding' IS NOT NULL
  LOOP
    BEGIN
      -- Extract the embedding array from JSONB
      -- Handle both array and object formats
      IF jsonb_typeof(chunk_record.chunk_metadata->'embedding') = 'array' THEN
        embedding_array := ARRAY(
          SELECT jsonb_array_elements_text(chunk_record.chunk_metadata->'embedding')::float
        );
      ELSIF chunk_record.chunk_metadata->'embedding'->>'data' IS NOT NULL THEN
        embedding_array := ARRAY(
          SELECT jsonb_array_elements_text(chunk_record.chunk_metadata->'embedding'->'data')::float
        );
      ELSE
        CONTINUE; -- Skip if format is not recognized
      END IF;
      
      -- Convert array to vector
      embedding_vector := embedding_array::vector;
      
      -- Insert into new table
      INSERT INTO file_embeddings (chunk_id, embedding, model_version)
      VALUES (
        chunk_record.id, 
        embedding_vector,
        COALESCE(chunk_record.chunk_metadata->>'model_version', 'text-embedding-3-small')
      )
      ON CONFLICT (chunk_id, model_version) DO NOTHING;
      
      -- Update chunk metadata to remove old embedding data
      UPDATE file_chunks
      SET chunk_metadata = chunk_metadata - 'embedding' - 'model_version'
      WHERE id = chunk_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other chunks
        RAISE NOTICE 'Error migrating chunk %: %', chunk_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_embeddings_to_vector();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS migrate_embeddings_to_vector();

-- Add migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO schema_migrations (version, name) 
VALUES (2, '002_migrate_existing_embeddings.sql')
ON CONFLICT (version) DO NOTHING;