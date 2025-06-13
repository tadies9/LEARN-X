-- File chunks table for storing processed content
CREATE TABLE IF NOT EXISTS file_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES course_files(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  position INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for file chunks
CREATE INDEX idx_file_chunks_file_id ON file_chunks(file_id);
CREATE INDEX idx_file_chunks_position ON file_chunks(file_id, position);

-- Chunk embeddings table (for future AI search)
CREATE TABLE IF NOT EXISTS chunk_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES course_files(id) ON DELETE CASCADE NOT NULL,
  chunk_id UUID REFERENCES file_chunks(id) ON DELETE CASCADE NOT NULL,
  embedding vector(1536), -- OpenAI embeddings dimension
  model VARCHAR(50) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for embeddings
CREATE INDEX idx_chunk_embeddings_file_id ON chunk_embeddings(file_id);
CREATE INDEX idx_chunk_embeddings_chunk_id ON chunk_embeddings(chunk_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- RLS Policies for file_chunks
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their files" ON file_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_files cf
      JOIN modules m ON cf.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE cf.id = file_chunks.file_id
      AND (c.user_id = auth.uid() OR c.is_public = true)
    )
  );

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Function to get processing stats
CREATE OR REPLACE FUNCTION get_file_processing_stats(p_user_id UUID)
RETURNS TABLE (
  total_files BIGINT,
  processed_files BIGINT,
  processing_files BIGINT,
  failed_files BIGINT,
  total_chunks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cf.id) AS total_files,
    COUNT(DISTINCT cf.id) FILTER (WHERE cf.status = 'processed') AS processed_files,
    COUNT(DISTINCT cf.id) FILTER (WHERE cf.status = 'processing') AS processing_files,
    COUNT(DISTINCT cf.id) FILTER (WHERE cf.status = 'failed') AS failed_files,
    COUNT(fc.id) AS total_chunks
  FROM course_files cf
  LEFT JOIN file_chunks fc ON cf.id = fc.file_id
  JOIN modules m ON cf.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;