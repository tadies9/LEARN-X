-- AI request tracking for cost monitoring
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- explain, summarize, flashcard, quiz, analogy, embedding
  model VARCHAR(50) NOT NULL, -- gpt-4o, text-embedding-3-small, etc.
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  cost DECIMAL(10,6), -- Cost in USD
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for AI requests
CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at DESC);
CREATE INDEX idx_ai_requests_user_daily ON ai_requests(user_id, created_at);

-- User feedback for content quality
CREATE TABLE IF NOT EXISTS content_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID NOT NULL, -- Can reference chunk_id or generated content ID
  helpful BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for feedback
CREATE INDEX idx_content_feedback_user_id ON content_feedback(user_id);
CREATE INDEX idx_content_feedback_content_id ON content_feedback(content_id);

-- Search logs for improving search
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER,
  clicked_results UUID[], -- Array of chunk IDs that were clicked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for search logs
CREATE INDEX idx_search_logs_user_id ON search_logs(user_id);
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at DESC);

-- RLS Policies
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own AI requests
CREATE POLICY "Users can view their own AI requests" ON ai_requests
  FOR SELECT USING (user_id = auth.uid());

-- Users can only manage their own feedback
CREATE POLICY "Users can view their own feedback" ON content_feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own feedback" ON content_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own feedback" ON content_feedback
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only see their own search logs
CREATE POLICY "Users can view their own search logs" ON search_logs
  FOR SELECT USING (user_id = auth.uid());

-- Function to get AI usage statistics
CREATE OR REPLACE FUNCTION get_ai_usage_stats(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
  total_requests BIGINT,
  total_cost DECIMAL,
  total_tokens BIGINT,
  cache_hit_rate DECIMAL,
  avg_response_time_ms DECIMAL,
  requests_by_type JSONB,
  requests_by_model JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total_requests,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS total_tokens,
      COALESCE(AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END), 0) AS cache_hit_rate,
      COALESCE(AVG(response_time_ms), 0) AS avg_response_time_ms
    FROM ai_requests
    WHERE user_id = p_user_id
      AND created_at BETWEEN p_start_date AND p_end_date
  ),
  by_type AS (
    SELECT jsonb_object_agg(request_type, count) AS requests_by_type
    FROM (
      SELECT request_type, COUNT(*) AS count
      FROM ai_requests
      WHERE user_id = p_user_id
        AND created_at BETWEEN p_start_date AND p_end_date
      GROUP BY request_type
    ) t
  ),
  by_model AS (
    SELECT jsonb_object_agg(model, count) AS requests_by_model
    FROM (
      SELECT model, COUNT(*) AS count
      FROM ai_requests
      WHERE user_id = p_user_id
        AND created_at BETWEEN p_start_date AND p_end_date
      GROUP BY model
    ) m
  )
  SELECT
    stats.total_requests,
    stats.total_cost,
    stats.total_tokens,
    stats.cache_hit_rate,
    stats.avg_response_time_ms,
    COALESCE(by_type.requests_by_type, '{}'::jsonb),
    COALESCE(by_model.requests_by_model, '{}'::jsonb)
  FROM stats, by_type, by_model;
END;
$$ LANGUAGE plpgsql;