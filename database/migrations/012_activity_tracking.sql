-- Activity log table for tracking user actions
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX idx_activity_log_type ON activity_log(type);
CREATE INDEX idx_activity_log_user_timestamp ON activity_log(user_id, timestamp DESC);

-- RLS policies
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add metadata column to profiles for storing streak info
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Function to get user streak info
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS TABLE(
  current_streak INT,
  longest_streak INT,
  last_active_date DATE,
  today_completed BOOLEAN,
  days_this_week INT
) AS $$
DECLARE
  v_activity_dates DATE[];
  v_current_streak INT := 0;
  v_longest_streak INT := 0;
  v_check_date DATE := CURRENT_DATE;
  v_today_completed BOOLEAN := FALSE;
  v_days_this_week INT := 0;
  v_last_active DATE;
BEGIN
  -- Get all unique activity dates for the user
  SELECT ARRAY_AGG(DISTINCT DATE(created_at) ORDER BY DATE(created_at) DESC)
  INTO v_activity_dates
  FROM study_sessions
  WHERE user_id = p_user_id;

  -- If no activities, return zeros
  IF v_activity_dates IS NULL THEN
    RETURN QUERY SELECT 0, 0, NULL::DATE, FALSE, 0;
    RETURN;
  END IF;

  v_last_active := v_activity_dates[1];
  
  -- Check if user has activity today
  IF v_last_active = CURRENT_DATE THEN
    v_today_completed := TRUE;
  ELSE
    v_check_date := v_check_date - INTERVAL '1 day';
  END IF;

  -- Calculate current streak
  FOREACH v_check_date IN ARRAY v_activity_dates LOOP
    EXIT WHEN v_check_date < v_activity_dates[array_position(v_activity_dates, v_check_date)];
    v_current_streak := v_current_streak + 1;
  END LOOP;

  -- Calculate days active this week
  SELECT COUNT(DISTINCT DATE(created_at))
  INTO v_days_this_week
  FROM study_sessions
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('week', CURRENT_DATE)
    AND created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week';

  -- For longest streak, we'd need a more complex calculation
  -- For now, return current streak as longest if it's the highest
  v_longest_streak := GREATEST(v_current_streak, COALESCE((metadata->>'longest_streak')::INT, 0))
  FROM profiles WHERE id = p_user_id;

  RETURN QUERY SELECT 
    v_current_streak,
    v_longest_streak,
    v_last_active,
    v_today_completed,
    v_days_this_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity and update streak
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS activity_log AS $$
DECLARE
  v_activity activity_log;
  v_streak_info RECORD;
BEGIN
  -- Insert the activity
  INSERT INTO activity_log (user_id, type, metadata)
  VALUES (p_user_id, p_type, p_metadata)
  RETURNING * INTO v_activity;

  -- Update streak info if this is a study-related activity
  IF p_type IN ('study_session', 'module_completed', 'quiz_completed', 'flashcard_practiced') THEN
    SELECT * INTO v_streak_info FROM get_user_streak(p_user_id);
    
    -- Update user's metadata with streak info
    UPDATE profiles
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{streak}',
      jsonb_build_object(
        'current', v_streak_info.current_streak,
        'longest', GREATEST(v_streak_info.current_streak, COALESCE((metadata->>'longest_streak')::INT, 0)),
        'lastUpdate', NOW()
      )
    )
    WHERE id = p_user_id;
  END IF;

  RETURN v_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON activity_log TO authenticated;
GRANT INSERT ON activity_log TO authenticated;