-- Add embedding status to course_files table
ALTER TABLE course_files 
ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS embeddings_generated_at TIMESTAMP WITH TIME ZONE;

-- Create index for embedding status
CREATE INDEX IF NOT EXISTS idx_course_files_embedding_status 
ON course_files(embedding_status);

-- Update existing processed files to have pending embedding status
UPDATE course_files 
SET embedding_status = 'pending' 
WHERE status = 'processed' AND embedding_status IS NULL;