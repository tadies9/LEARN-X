-- Course & Content Management Schema

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT false,
  estimated_duration INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Course files table
CREATE TABLE IF NOT EXISTS course_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  processing_status VARCHAR(50) DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- File chunks table (for processed content)
CREATE TABLE IF NOT EXISTS file_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES course_files(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- for OpenAI embeddings
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Course progress tracking
CREATE TABLE IF NOT EXISTS course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  file_id UUID REFERENCES course_files(id) ON DELETE SET NULL,
  progress_percentage INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(user_id, course_id)
);

-- Indexes
CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_is_public ON courses(is_public);
CREATE INDEX idx_courses_is_archived ON courses(is_archived);
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_modules_position ON modules(course_id, position);
CREATE INDEX idx_course_files_module_id ON course_files(module_id);
CREATE INDEX idx_course_files_processing_status ON course_files(processing_status);
CREATE INDEX idx_file_chunks_file_id ON file_chunks(file_id);
CREATE INDEX idx_course_progress_user_course ON course_progress(user_id, course_id);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Users can view their own courses" ON courses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public courses" ON courses
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create their own courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" ON courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" ON courses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for modules
CREATE POLICY "Users can view modules of accessible courses" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND (courses.user_id = auth.uid() OR courses.is_public = true)
    )
  );

CREATE POLICY "Users can manage modules of their courses" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- RLS Policies for course_files
CREATE POLICY "Users can view files of accessible modules" ON course_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = course_files.module_id
      AND (courses.user_id = auth.uid() OR courses.is_public = true)
    )
  );

CREATE POLICY "Users can manage files of their modules" ON course_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = course_files.module_id
      AND courses.user_id = auth.uid()
    )
  );

-- RLS Policies for file_chunks
CREATE POLICY "Users can view chunks of accessible files" ON file_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_files
      JOIN modules ON modules.id = course_files.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE course_files.id = file_chunks.file_id
      AND (courses.user_id = auth.uid() OR courses.is_public = true)
    )
  );

-- RLS Policies for course_progress
CREATE POLICY "Users can view their own progress" ON course_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress" ON course_progress
  FOR ALL USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_files_updated_at BEFORE UPDATE ON course_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reorder modules
CREATE OR REPLACE FUNCTION reorder_modules(
  p_module_id UUID,
  p_new_position INTEGER
) RETURNS VOID AS $$
DECLARE
  v_course_id UUID;
  v_old_position INTEGER;
BEGIN
  -- Get current position and course
  SELECT course_id, position INTO v_course_id, v_old_position
  FROM modules WHERE id = p_module_id;
  
  -- Update positions
  IF v_old_position < p_new_position THEN
    -- Moving down
    UPDATE modules 
    SET position = position - 1
    WHERE course_id = v_course_id 
    AND position > v_old_position 
    AND position <= p_new_position;
  ELSIF v_old_position > p_new_position THEN
    -- Moving up
    UPDATE modules 
    SET position = position + 1
    WHERE course_id = v_course_id 
    AND position >= p_new_position 
    AND position < v_old_position;
  END IF;
  
  -- Update module position
  UPDATE modules SET position = p_new_position WHERE id = p_module_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON courses TO authenticated;
GRANT ALL ON modules TO authenticated;
GRANT ALL ON course_files TO authenticated;
GRANT ALL ON file_chunks TO authenticated;
GRANT ALL ON course_progress TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_modules TO authenticated;