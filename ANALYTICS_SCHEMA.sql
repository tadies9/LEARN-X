-- Onboarding Analytics Table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  step VARCHAR(50),
  time_spent INTEGER, -- milliseconds
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Indexes for performance
CREATE INDEX idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_analytics_event_type ON onboarding_analytics(event_type);
CREATE INDEX idx_onboarding_analytics_created_at ON onboarding_analytics(created_at);

-- RLS Policies
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own analytics events
CREATE POLICY "Users can insert own analytics" ON onboarding_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can read analytics (we'll need to add an admin role check)
CREATE POLICY "Admins can read all analytics" ON onboarding_analytics
  FOR SELECT USING (true); -- TODO: Add admin check

-- Grant permissions
GRANT INSERT ON onboarding_analytics TO authenticated;
GRANT SELECT ON onboarding_analytics TO authenticated; -- TODO: Restrict to admins