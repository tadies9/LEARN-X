-- ============================================================================
-- Migration: Fix Schema Consistency Issues
-- Date: 2025-06-15
-- Purpose: Add missing persona_history table and fix study_sessions foreign key
-- ============================================================================

-- 1. Create persona_history table for ML/analytics
-- This table tracks persona evolution over time
CREATE TABLE IF NOT EXISTS persona_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_context JSONB DEFAULT '{}',
    personal_interests JSONB DEFAULT '{}',
    learning_style JSONB DEFAULT '{}',
    content_preferences JSONB DEFAULT '{}',
    communication_tone JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add index for efficient user history queries
CREATE INDEX IF NOT EXISTS idx_persona_history_user_created 
ON persona_history(user_id, created_at DESC);

-- Enable RLS on persona_history
ALTER TABLE persona_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for persona_history (users can only see their own history)
CREATE POLICY "Users can view own persona history" ON persona_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona history" ON persona_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to persona history" ON persona_history
    FOR ALL USING (auth.role() = 'service_role');

-- 2. Fix study_sessions foreign key reference
-- First, check if there are any existing study sessions referencing the old files table
DO $$ 
BEGIN
    -- Only proceed if study_sessions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'study_sessions') THEN
        
        -- Drop the existing foreign key constraint
        ALTER TABLE study_sessions 
        DROP CONSTRAINT IF EXISTS study_sessions_file_id_fkey;
        
        -- Add the new foreign key constraint to course_files
        ALTER TABLE study_sessions 
        ADD CONSTRAINT study_sessions_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES course_files(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Successfully updated study_sessions foreign key from files to course_files';
    ELSE
        RAISE NOTICE 'study_sessions table does not exist, skipping foreign key update';
    END IF;
END $$;

-- 3. Grant necessary permissions
GRANT ALL ON persona_history TO service_role;
GRANT SELECT ON persona_history TO authenticated;

-- 4. Add helpful comment to study_sessions table
COMMENT ON COLUMN study_sessions.file_id IS 'References course_files(id) - updated from legacy files table';

-- ============================================================================
-- Migration Complete
-- ============================================================================