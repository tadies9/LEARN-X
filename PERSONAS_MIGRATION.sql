-- Create personas table for LEARN-X
-- This matches the backend's expected table structure

-- Create the personas table
CREATE TABLE IF NOT EXISTS public.personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Store complete persona objects as JSONB
    professional_context JSONB DEFAULT '{}'::jsonb,
    personal_interests JSONB DEFAULT '{}'::jsonb,
    learning_style JSONB DEFAULT '{}'::jsonb,
    content_preferences JSONB DEFAULT '{}'::jsonb,
    communication_tone JSONB DEFAULT '{}'::jsonb,
    
    -- Version tracking
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one persona per user
    CONSTRAINT unique_user_persona UNIQUE(user_id)
);

-- Create persona history table for version tracking
CREATE TABLE IF NOT EXISTS public.persona_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Store complete persona snapshot
    professional_context JSONB,
    personal_interests JSONB,
    learning_style JSONB,
    content_preferences JSONB,
    communication_tone JSONB,
    
    version INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for querying history
    INDEX idx_persona_history_user_id (user_id),
    INDEX idx_persona_history_created_at (created_at DESC)
);

-- Enable Row Level Security
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personas
CREATE POLICY "Users can view their own persona" ON public.personas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona" ON public.personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persona" ON public.personas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own persona" ON public.personas
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for persona_history
CREATE POLICY "Users can view their own persona history" ON public.persona_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona history" ON public.persona_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_personas_updated_at ON public.personas(updated_at DESC);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();