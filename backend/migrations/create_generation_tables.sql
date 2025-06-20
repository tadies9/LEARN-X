-- Create generation_jobs table
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  file_ids UUID[] NOT NULL,
  output_types TEXT[] NOT NULL,
  options JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create generation_results table
CREATE TABLE IF NOT EXISTS generation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES course_files(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_created_at ON generation_jobs(created_at DESC);
CREATE INDEX idx_generation_results_job_id ON generation_results(job_id);
CREATE INDEX idx_generation_results_file_id ON generation_results(file_id);

-- Add RLS policies
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own generation jobs
CREATE POLICY "Users can view own generation jobs" ON generation_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generation jobs" ON generation_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view results for their jobs
CREATE POLICY "Users can view results for own jobs" ON generation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM generation_jobs 
      WHERE generation_jobs.id = generation_results.job_id 
      AND generation_jobs.user_id = auth.uid()
    )
  );

-- Service role can manage all records
CREATE POLICY "Service role full access to generation_jobs" ON generation_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to generation_results" ON generation_results
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');