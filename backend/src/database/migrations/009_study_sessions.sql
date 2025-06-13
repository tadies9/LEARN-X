-- Study sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES course_files(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER DEFAULT 0, -- seconds
  progress JSONB DEFAULT '{}', -- detailed progress data
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_active_session UNIQUE (user_id, file_id, ended_at)
);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES course_files(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES file_chunks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  note TEXT,
  color VARCHAR(7) DEFAULT '#FFFF00',
  position JSONB NOT NULL, -- {page, x, y, width, height}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Study progress table
CREATE TABLE IF NOT EXISTS study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES course_files(id) ON DELETE CASCADE,
  completed_chunks UUID[] DEFAULT '{}',
  total_time INTEGER DEFAULT 0, -- seconds
  last_position JSONB, -- {page, scroll}
  stats JSONB DEFAULT '{}', -- questions, flashcards, etc
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_file_progress UNIQUE (user_id, file_id)
);

-- Indexes
CREATE INDEX idx_study_sessions_user_file ON study_sessions(user_id, file_id);
CREATE INDEX idx_study_sessions_created ON study_sessions(created_at DESC);
CREATE INDEX idx_annotations_user_file ON annotations(user_id, file_id);
CREATE INDEX idx_annotations_chunk ON annotations(chunk_id);
CREATE INDEX idx_study_progress_user_file ON study_progress(user_id, file_id);

-- RLS Policies
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

-- Study sessions policies
CREATE POLICY "Users can view own study sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Annotations policies
CREATE POLICY "Users can view own annotations" ON annotations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own annotations" ON annotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations" ON annotations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations" ON annotations
  FOR DELETE USING (auth.uid() = user_id);

-- Study progress policies
CREATE POLICY "Users can view own progress" ON study_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON study_progress
  FOR ALL USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_study_stats()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_study_progress_timestamp
  BEFORE UPDATE ON study_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_study_stats();

CREATE TRIGGER update_annotation_timestamp
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_study_stats();