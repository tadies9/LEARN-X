-- Create saved_content table
CREATE TABLE IF NOT EXISTS saved_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES course_files(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  subtopic TEXT DEFAULT '',
  content TEXT NOT NULL,
  mode TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique saves per user/file/topic/subtopic/mode combination
  UNIQUE(user_id, file_id, topic_id, subtopic, mode)
);

-- Create indexes for performance
CREATE INDEX idx_saved_content_user_id ON saved_content(user_id);
CREATE INDEX idx_saved_content_file_id ON saved_content(file_id);
CREATE INDEX idx_saved_content_updated_at ON saved_content(updated_at DESC);
CREATE INDEX idx_saved_content_tags ON saved_content USING GIN(tags);

-- Enable RLS
ALTER TABLE saved_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved content"
  ON saved_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved content"
  ON saved_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved content"
  ON saved_content FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved content"
  ON saved_content FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_content_updated_at
  BEFORE UPDATE ON saved_content
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_content_updated_at();