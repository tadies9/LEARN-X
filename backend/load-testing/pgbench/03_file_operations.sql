-- pgbench script for file operation patterns
-- Tests file chunks and embedding operations

\set file_id '''550e8400-e29b-41d4-a716-446655440000'''::uuid
\set chunk_count 100
\set user_id '''b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'''::uuid

-- Query 1: Get all chunks for a file
SELECT 
  fc.id,
  fc.content,
  fc.chunk_index,
  fc.chunk_type,
  fc.importance,
  fc.metadata,
  fe.chunk_id IS NOT NULL as has_embedding
FROM file_chunks fc
LEFT JOIN file_embeddings fe ON fc.id = fe.chunk_id
WHERE fc.file_id = :file_id
ORDER BY fc.chunk_index;

-- Query 2: Check file processing status
SELECT 
  cf.id,
  cf.name,
  cf.status,
  cf.processing_metadata,
  COUNT(fc.id) as chunk_count,
  COUNT(fe.chunk_id) as embedded_chunks
FROM course_files cf
LEFT JOIN file_chunks fc ON cf.id = fc.file_id
LEFT JOIN file_embeddings fe ON fc.id = fe.chunk_id
WHERE cf.id = :file_id
GROUP BY cf.id, cf.name, cf.status, cf.processing_metadata;

-- Query 3: Batch chunk metadata update simulation
WITH chunk_updates AS (
  SELECT 
    fc.id as chunk_id,
    jsonb_build_object(
      'concepts', jsonb_build_array('concept1', 'concept2'),
      'keywords', jsonb_build_array('keyword1', 'keyword2'),
      'processing_time', random() * 1000
    ) as metadata
  FROM file_chunks fc
  WHERE fc.file_id = :file_id
  LIMIT 10
)
UPDATE file_chunks fc
SET 
  metadata = fc.metadata || cu.metadata,
  updated_at = NOW()
FROM chunk_updates cu
WHERE fc.id = cu.chunk_id;