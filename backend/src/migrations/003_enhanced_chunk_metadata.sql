-- Migration to support enhanced chunk metadata from semantic chunking
-- This adds new fields to support document structure analysis and semantic chunking

-- First, ensure the metadata column is JSONB
ALTER TABLE file_chunks 
ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

-- Add new columns for semantic chunking metadata
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS chunk_type TEXT;
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER;
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS importance TEXT CHECK (importance IN ('high', 'medium', 'low'));
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS section_title TEXT;
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS is_start_of_section BOOLEAN DEFAULT FALSE;
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS is_end_of_section BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_file_chunks_chunk_type ON file_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_file_chunks_importance ON file_chunks(importance);
CREATE INDEX IF NOT EXISTS idx_file_chunks_hierarchy ON file_chunks(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_file_chunks_section ON file_chunks(section_title);

-- Create a function to extract semantic metadata from JSONB
CREATE OR REPLACE FUNCTION update_chunk_semantic_metadata() RETURNS TRIGGER AS $$
BEGIN
  -- Extract semantic metadata from JSONB metadata field
  NEW.chunk_type := COALESCE(NEW.metadata->>'type', NEW.metadata->>'semantic_type', 'other');
  NEW.hierarchy_level := COALESCE((NEW.metadata->>'hierarchyLevel')::INTEGER, (NEW.metadata->>'hierarchy_level')::INTEGER, 1);
  NEW.importance := COALESCE(NEW.metadata->>'importance', 'medium');
  NEW.section_title := COALESCE(NEW.metadata->>'sectionTitle', NEW.metadata->>'section_title');
  NEW.is_start_of_section := COALESCE((NEW.metadata->>'isStartOfSection')::BOOLEAN, (NEW.metadata->>'is_start_of_section')::BOOLEAN, FALSE);
  NEW.is_end_of_section := COALESCE((NEW.metadata->>'isEndOfSection')::BOOLEAN, (NEW.metadata->>'is_end_of_section')::BOOLEAN, FALSE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate semantic metadata
CREATE TRIGGER update_chunk_semantic_metadata_trigger
BEFORE INSERT OR UPDATE ON file_chunks
FOR EACH ROW
EXECUTE FUNCTION update_chunk_semantic_metadata();

-- Update existing chunks to populate new fields
UPDATE file_chunks
SET 
  chunk_type = COALESCE(metadata->>'type', metadata->>'semantic_type', 'other'),
  hierarchy_level = COALESCE((metadata->>'hierarchyLevel')::INTEGER, (metadata->>'hierarchy_level')::INTEGER, 1),
  importance = COALESCE(metadata->>'importance', 'medium'),
  section_title = COALESCE(metadata->>'sectionTitle', metadata->>'section_title'),
  is_start_of_section = COALESCE((metadata->>'isStartOfSection')::BOOLEAN, (metadata->>'is_start_of_section')::BOOLEAN, FALSE),
  is_end_of_section = COALESCE((metadata->>'isEndOfSection')::BOOLEAN, (metadata->>'is_end_of_section')::BOOLEAN, FALSE)
WHERE chunk_type IS NULL;

-- Create a view for easier querying of semantic chunks
CREATE OR REPLACE VIEW semantic_chunks AS
SELECT 
  fc.id,
  fc.file_id,
  fc.content,
  fc.chunk_index,
  fc.chunk_type,
  fc.hierarchy_level,
  fc.importance,
  fc.section_title,
  fc.is_start_of_section,
  fc.is_end_of_section,
  fc.metadata->>'concepts' as concepts,
  fc.metadata->>'keywords' as keywords,
  fc.metadata->>'references' as references,
  fc.metadata->>'academicLevel' as academic_level,
  cf.name as file_name,
  cf.course_id,
  cf.module_id,
  cf.mime_type,
  cf.status as file_status
FROM file_chunks fc
JOIN course_files cf ON fc.file_id = cf.id
WHERE cf.status = 'completed';

-- Add comments for documentation
COMMENT ON COLUMN file_chunks.chunk_type IS 'Type of content: definition, explanation, example, theory, practice, summary, etc.';
COMMENT ON COLUMN file_chunks.hierarchy_level IS 'Document hierarchy level (1-6 for heading levels)';
COMMENT ON COLUMN file_chunks.importance IS 'Importance level of the chunk: high, medium, or low';
COMMENT ON COLUMN file_chunks.section_title IS 'Title of the section this chunk belongs to';
COMMENT ON COLUMN file_chunks.is_start_of_section IS 'Whether this chunk starts a new section';
COMMENT ON COLUMN file_chunks.is_end_of_section IS 'Whether this chunk ends a section';
COMMENT ON VIEW semantic_chunks IS 'Denormalized view of semantic chunks with file information for easier querying';