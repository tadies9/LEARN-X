-- LEARN-X Supabase Database Schema
-- Optimized for Supabase with RLS policies and proper indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "vector"; -- For embeddings

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'team');
CREATE TYPE learning_style AS ENUM ('visual', 'auditory', 'reading', 'kinesthetic', 'mixed');
CREATE TYPE content_density AS ENUM ('concise', 'balanced', 'comprehensive');
CREATE TYPE tone_preference AS ENUM ('formal', 'professional', 'friendly', 'casual');
CREATE TYPE encouragement_level AS ENUM ('minimal', 'moderate', 'high');
CREATE TYPE file_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE technical_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- User personas (core personalization data)
CREATE TABLE public.user_personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Professional Context
    current_role VARCHAR(255),
    industry VARCHAR(255),
    experience_years INTEGER CHECK (experience_years >= 0),
    career_goals TEXT[],
    technical_level technical_level DEFAULT 'beginner',
    
    -- Personal Interests (for analogies)
    primary_interests TEXT[] DEFAULT '{}',
    secondary_interests TEXT[] DEFAULT '{}',
    hobbies TEXT[] DEFAULT '{}',
    
    -- Learning Preferences
    learning_style learning_style DEFAULT 'mixed',
    learning_style_strength DECIMAL(3,2) DEFAULT 0.8 CHECK (learning_style_strength >= 0 AND learning_style_strength <= 1),
    content_density content_density DEFAULT 'balanced',
    examples_per_concept INTEGER DEFAULT 2 CHECK (examples_per_concept >= 1 AND examples_per_concept <= 10),
    
    -- Communication Style
    tone_preference tone_preference DEFAULT 'friendly',
    encouragement_level encouragement_level DEFAULT 'moderate',
    technical_comfort DECIMAL(3,2) DEFAULT 0.5 CHECK (technical_comfort >= 0 AND technical_comfort <= 1),
    humor_enabled BOOLEAN DEFAULT false,
    
    -- Metadata
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_persona UNIQUE(user_id)
);

-- Courses
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366F1' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    icon VARCHAR(50) DEFAULT 'book',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT unique_course_title_per_user UNIQUE(user_id, title)
);

-- Modules within courses
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_module_order UNIQUE(course_id, order_index)
);

-- Files/Documents
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Denormalized for RLS
    
    -- File info
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    storage_path TEXT NOT NULL, -- Supabase storage path
    
    -- Processing status
    status file_status DEFAULT 'pending',
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    processing_duration_ms INTEGER,
    
    -- Extracted metadata
    page_count INTEGER CHECK (page_count > 0),
    word_count INTEGER CHECK (word_count > 0),
    extracted_topics TEXT[] DEFAULT '{}',
    difficulty_level technical_level,
    language VARCHAR(10) DEFAULT 'en',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks with embeddings
CREATE TABLE public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Denormalized for RLS
    
    -- Chunk data
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    chunk_text TEXT NOT NULL,
    chunk_tokens INTEGER NOT NULL CHECK (chunk_tokens > 0),
    
    -- Vector embedding for similarity search
    embedding vector(1536), -- OpenAI text-embedding-ada-002 dimension
    
    -- Metadata for context
    start_page INTEGER,
    end_page INTEGER,
    start_char INTEGER CHECK (start_char >= 0),
    end_char INTEGER CHECK (end_char > start_char),
    heading_context TEXT, -- Parent headings for context
    chunk_type VARCHAR(50) DEFAULT 'paragraph', -- paragraph, heading, list, table, code
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_chunk_index UNIQUE(file_id, chunk_index)
);

-- Study sessions
CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    
    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN ended_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
            ELSE NULL
        END
    ) STORED,
    
    -- Session metrics
    concepts_covered TEXT[] DEFAULT '{}',
    questions_asked INTEGER DEFAULT 0 CHECK (questions_asked >= 0),
    summaries_generated INTEGER DEFAULT 0 CHECK (summaries_generated >= 0),
    flashcards_created INTEGER DEFAULT 0 CHECK (flashcards_created >= 0),
    
    -- User feedback
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    feedback_text TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI interactions log
CREATE TABLE public.ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    
    -- Interaction details
    interaction_type VARCHAR(50) NOT NULL, -- question, summary, flashcard, explanation, personalization
    
    -- Request data
    user_input TEXT,
    context_chunks UUID[] DEFAULT '{}', -- References to document_chunks used
    persona_snapshot JSONB, -- Snapshot of user persona at request time
    
    -- Response data
    ai_response TEXT NOT NULL,
    model_used VARCHAR(50) NOT NULL DEFAULT 'gpt-4',
    prompt_tokens INTEGER CHECK (prompt_tokens > 0),
    completion_tokens INTEGER CHECK (completion_tokens > 0),
    total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
    response_time_ms INTEGER CHECK (response_time_ms > 0),
    
    -- Cost tracking
    estimated_cost_cents INTEGER GENERATED ALWAYS AS (
        -- Rough cost calculation (adjust based on actual pricing)
        CASE 
            WHEN model_used = 'gpt-4' THEN (prompt_tokens * 3 + completion_tokens * 6) / 100
            WHEN model_used = 'gpt-3.5-turbo' THEN (prompt_tokens * 1 + completion_tokens * 2) / 1000
            ELSE 0
        END
    ) STORED,
    
    -- Feedback
    helpful BOOLEAN,
    flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Learning progress tracking
CREATE TABLE public.learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    
    -- Progress metrics
    mastery_level DECIMAL(3,2) DEFAULT 0.0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
    time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Concept tracking
    concepts_introduced TEXT[] DEFAULT '{}',
    concepts_mastered TEXT[] DEFAULT '{}',
    weak_areas TEXT[] DEFAULT '{}',
    
    -- Streak tracking
    current_streak_days INTEGER DEFAULT 0 CHECK (current_streak_days >= 0),
    longest_streak_days INTEGER DEFAULT 0 CHECK (longest_streak_days >= 0),
    last_streak_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_course_module UNIQUE(user_id, course_id, module_id)
);

-- Flashcards
CREATE TABLE public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    
    -- Card content
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    
    -- Metadata
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags TEXT[] DEFAULT '{}',
    source_chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE SET NULL,
    
    -- Spaced repetition data
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    ease_factor DECIMAL(3,2) DEFAULT 2.5 CHECK (ease_factor >= 1.3),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User settings
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Notification preferences
    email_summaries BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly', 'monthly', 'never')),
    push_notifications BOOLEAN DEFAULT true,
    
    -- UI preferences
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    font_size VARCHAR(20) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
    reduced_motion BOOLEAN DEFAULT false,
    high_contrast BOOLEAN DEFAULT false,
    
    -- Privacy settings
    analytics_enabled BOOLEAN DEFAULT true,
    share_progress BOOLEAN DEFAULT false,
    public_profile BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription ON public.users(subscription_tier, subscription_expires_at);

CREATE INDEX idx_personas_user ON public.user_personas(user_id);

CREATE INDEX idx_courses_user ON public.courses(user_id, is_archived);
CREATE INDEX idx_courses_updated ON public.courses(updated_at DESC);

CREATE INDEX idx_modules_course ON public.modules(course_id, order_index);

CREATE INDEX idx_files_module ON public.files(module_id);
CREATE INDEX idx_files_user ON public.files(user_id);
CREATE INDEX idx_files_status ON public.files(status);
CREATE INDEX idx_files_created ON public.files(created_at DESC);

CREATE INDEX idx_chunks_file ON public.document_chunks(file_id, chunk_index);
CREATE INDEX idx_chunks_user ON public.document_chunks(user_id);

-- Vector similarity search index (using ivfflat)
CREATE INDEX idx_chunks_embedding ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full text search indexes
CREATE INDEX idx_chunks_text_search ON public.document_chunks 
USING gin(to_tsvector('english', chunk_text));

CREATE INDEX idx_chunks_heading ON public.document_chunks 
USING gin(heading_context gin_trgm_ops);

CREATE INDEX idx_sessions_user ON public.study_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_file ON public.study_sessions(file_id);

CREATE INDEX idx_interactions_user ON public.ai_interactions(user_id, created_at DESC);
CREATE INDEX idx_interactions_session ON public.ai_interactions(session_id);
CREATE INDEX idx_interactions_type ON public.ai_interactions(interaction_type);

CREATE INDEX idx_progress_user_course ON public.learning_progress(user_id, course_id);
CREATE INDEX idx_progress_updated ON public.learning_progress(updated_at DESC);

CREATE INDEX idx_flashcards_user ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_next_review ON public.flashcards(next_review_at);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.user_personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON public.learning_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own persona" ON public.user_personas
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own courses" ON public.courses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage modules in own courses" ON public.modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = modules.course_id 
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own files" ON public.files
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chunks" ON public.document_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own AI interactions" ON public.ai_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON public.learning_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Functions for common queries
CREATE OR REPLACE FUNCTION get_user_courses_with_progress(p_user_id UUID)
RETURNS TABLE (
    course_id UUID,
    title VARCHAR,
    description TEXT,
    color VARCHAR,
    icon VARCHAR,
    module_count BIGINT,
    overall_mastery DECIMAL,
    last_accessed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.color,
        c.icon,
        COUNT(DISTINCT m.id) as module_count,
        COALESCE(AVG(lp.mastery_level), 0) as overall_mastery,
        MAX(lp.last_accessed_at) as last_accessed
    FROM public.courses c
    LEFT JOIN public.modules m ON c.id = m.course_id
    LEFT JOIN public.learning_progress lp ON c.id = lp.course_id AND lp.user_id = p_user_id
    WHERE c.user_id = p_user_id AND NOT c.is_archived
    GROUP BY c.id, c.title, c.description, c.color, c.icon
    ORDER BY last_accessed DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for semantic search
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    chunk_id UUID,
    file_id UUID,
    chunk_text TEXT,
    similarity FLOAT,
    chunk_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.file_id,
        dc.chunk_text,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        jsonb_build_object(
            'start_page', dc.start_page,
            'end_page', dc.end_page,
            'chunk_type', dc.chunk_type,
            'heading_context', dc.heading_context
        ) AS chunk_metadata
    FROM public.document_chunks dc
    WHERE (p_user_id IS NULL OR dc.user_id = p_user_id)
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Analytics functions
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID, days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH stats AS (
        SELECT
            COUNT(DISTINCT DATE(ss.started_at)) as days_active,
            COUNT(DISTINCT ss.id) as total_sessions,
            COALESCE(SUM(ss.duration_seconds), 0) as total_seconds,
            COUNT(DISTINCT ai.id) as total_interactions,
            COALESCE(AVG(ss.helpfulness_rating), 0) as avg_rating
        FROM public.study_sessions ss
        LEFT JOIN public.ai_interactions ai ON ai.user_id = p_user_id
        WHERE ss.user_id = p_user_id 
            AND ss.started_at >= CURRENT_DATE - INTERVAL '1 day' * days
    ),
    progress AS (
        SELECT
            COUNT(DISTINCT course_id) as courses_active,
            AVG(mastery_level) as avg_mastery,
            array_agg(DISTINCT unnest) as all_concepts_mastered
        FROM public.learning_progress,
            unnest(concepts_mastered)
        WHERE user_id = p_user_id
    )
    SELECT jsonb_build_object(
        'days_active', stats.days_active,
        'total_sessions', stats.total_sessions,
        'total_hours', ROUND(stats.total_seconds::DECIMAL / 3600, 1),
        'total_interactions', stats.total_interactions,
        'avg_rating', ROUND(stats.avg_rating, 2),
        'courses_active', progress.courses_active,
        'avg_mastery', ROUND(COALESCE(progress.avg_mastery, 0), 2),
        'concepts_mastered', COALESCE(array_length(progress.all_concepts_mastered, 1), 0)
    ) INTO result
    FROM stats, progress;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;