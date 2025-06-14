-- Create ai_requests table for tracking AI usage and costs
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX idx_ai_requests_request_type ON ai_requests(request_type);
CREATE INDEX idx_ai_requests_model ON ai_requests(model);

-- Add comment to table
COMMENT ON TABLE ai_requests IS 'Tracks all AI API requests for cost monitoring and usage analytics';

-- Add column comments
COMMENT ON COLUMN ai_requests.user_id IS 'User who made the request';
COMMENT ON COLUMN ai_requests.request_type IS 'Type of AI request (embedding, completion, etc)';
COMMENT ON COLUMN ai_requests.model IS 'AI model used (gpt-4, text-embedding-3-small, etc)';
COMMENT ON COLUMN ai_requests.prompt_tokens IS 'Number of tokens in the prompt';
COMMENT ON COLUMN ai_requests.completion_tokens IS 'Number of tokens in the completion (0 for embeddings)';
COMMENT ON COLUMN ai_requests.cost IS 'Estimated cost in USD';
COMMENT ON COLUMN ai_requests.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN ai_requests.cache_hit IS 'Whether the response was served from cache';