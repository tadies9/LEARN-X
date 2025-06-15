-- ============================================================================
-- LEARN-X DATABASE SCHEMA (CURRENT STATE)
-- ============================================================================
-- Generated from actual Supabase database after cleanup
-- Date: June 15, 2025
-- Total Tables: 18 active tables
-- Total Storage: ~45 MB
-- 
-- This file represents the ACTUAL current state of the database
-- Use this as the single source of truth for schema reference
-- ============================================================================

-- ============================================================================
-- ENUMS & CUSTOM TYPES
-- ============================================================================

CREATE TYPE file_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE technical_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'team');

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR NOT NULL UNIQUE,
    full_name VARCHAR,
    avatar_url TEXT,
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- User personas (JSONB-based flexible schema)
CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    professional_context JSONB DEFAULT '{}',
    personal_interests JSONB DEFAULT '{}',
    learning_style JSONB DEFAULT '{}',
    content_preferences JSONB DEFAULT '{}',
    communication_tone JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COURSE MANAGEMENT SYSTEM
-- ============================================================================

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR NOT NULL,
    description TEXT,
    color VARCHAR DEFAULT '#6366F1' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    icon VARCHAR DEFAULT 'book',
    is_archived BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Course modules
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id),
    title VARCHAR NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    position INTEGER,
    is_published BOOLEAN DEFAULT false,
    estimated_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FILE MANAGEMENT & PROCESSING
-- ============================================================================

-- Course files (primary file storage - 25 rows, 128 kB)
CREATE TABLE IF NOT EXISTS course_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id),
    module_id UUID REFERENCES modules(id),
    name VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR,
    size_bytes BIGINT,
    status file_status DEFAULT 'pending',
    processing_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Legacy files table (0 rows, kept for compatibility)
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id),
    user_id UUID NOT NULL REFERENCES users(id),
    filename VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    storage_path TEXT NOT NULL,
    status file_status DEFAULT 'pending',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    processing_duration_ms INTEGER,
    page_count INTEGER CHECK (page_count > 0),
    word_count INTEGER CHECK (word_count > 0),
    extracted_topics TEXT[] DEFAULT '{}',
    difficulty_level technical_level,
    language VARCHAR DEFAULT 'en',
    mime_type VARCHAR,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    position INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- File chunks (content processing - 1,505 rows, 9.6 MB)
CREATE TABLE IF NOT EXISTS file_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES course_files(id),
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER,
    metadata JSONB DEFAULT '{}',
    chunk_metadata JSONB DEFAULT '{}',
    chunk_type TEXT, -- definition, explanation, example, theory, practice, summary
    hierarchy_level INTEGER DEFAULT 0, -- 1-6 for heading levels
    importance TEXT CHECK (importance = ANY (ARRAY['high', 'medium', 'low'])),
    section_title TEXT,
    is_start_of_section BOOLEAN DEFAULT false,
    is_end_of_section BOOLEAN DEFAULT false,
    search_vector TSVECTOR,
    concepts JSONB DEFAULT '[]',
    content_length INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- File embeddings (vector search - 1,505 rows, 30 MB - LARGEST TABLE)
CREATE TABLE IF NOT EXISTS file_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES file_chunks(id),
    embedding VECTOR NOT NULL,
    model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Search index (materialized view for search performance - 56 rows, 3 MB)
CREATE TABLE IF NOT EXISTS search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    course_id UUID,
    module_id UUID,
    content TEXT,
    metadata JSONB,
    search_vector TSVECTOR,
    embedding VECTOR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- LEARNING & STUDY SYSTEM (ALL ACTIVE)
-- ============================================================================

-- Study sessions (active learning system)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    file_id UUID NOT NULL REFERENCES files(id), -- References legacy files table
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN ended_at IS NOT NULL 
            THEN EXTRACT(epoch FROM (ended_at - started_at))::integer
            ELSE NULL
        END
    ) STORED,
    concepts_covered TEXT[] DEFAULT '{}',
    questions_asked INTEGER DEFAULT 0 CHECK (questions_asked >= 0),
    summaries_generated INTEGER DEFAULT 0 CHECK (summaries_generated >= 0),
    flashcards_created INTEGER DEFAULT 0 CHECK (flashcards_created >= 0),
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Annotations (active annotation system)
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    file_id UUID NOT NULL REFERENCES course_files(id),
    chunk_id UUID REFERENCES file_chunks(id),
    text TEXT NOT NULL,
    note TEXT,
    color VARCHAR DEFAULT '#FFFF00',
    position JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Study progress (active progress tracking)
CREATE TABLE IF NOT EXISTS study_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    file_id UUID NOT NULL REFERENCES course_files(id),
    completed_chunks UUID[] DEFAULT '{}',
    total_time INTEGER DEFAULT 0,
    last_position JSONB,
    stats JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- AI & ANALYTICS
-- ============================================================================

-- AI requests tracking (282 rows, 168 kB)
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    request_type VARCHAR NOT NULL,
    model VARCHAR NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    cost DECIMAL(10, 6) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding analytics (20 rows, 80 kB)
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type VARCHAR NOT NULL,
    step VARCHAR,
    time_spent INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Notifications (6 rows, 80 kB)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- ============================================================================
-- QUEUE & JOB MANAGEMENT
-- ============================================================================

-- Enhanced job tracking (4 rows, 120 kB)
CREATE TABLE IF NOT EXISTS enhanced_job_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    message_id BIGINT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status = ANY (ARRAY['queued', 'processing', 'completed', 'failed', 'archived'])),
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    processing_time_ms INTEGER,
    worker_id TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Job tracking (61 rows, 1 MB)
CREATE TABLE IF NOT EXISTS job_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL,
    message_id BIGINT,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    error_details JSONB,
    metadata JSONB DEFAULT '{}'
);

-- Schema migrations (4 rows, 32 kB)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES (CRITICAL FOR PERFORMANCE)
-- ============================================================================

-- Vector search index (16 MB but essential for semantic search)
CREATE INDEX IF NOT EXISTS file_embeddings_embedding_idx 
    ON file_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Text search index
CREATE INDEX IF NOT EXISTS idx_file_chunks_search_vector 
    ON file_chunks USING gin(search_vector);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_chunk_id ON file_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON course_files(course_id);
CREATE INDEX IF NOT EXISTS idx_course_files_module_id ON course_files(module_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_file ON study_sessions(user_id, file_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_file ON annotations(user_id, file_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_user_file ON study_progress(user_id, file_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their own data)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own personas" ON personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own courses" ON courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Course files bucket (for file uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-files', 'course-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'course-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'course-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total Tables: 18
-- Total Size: ~45 MB
-- Key Tables:
--   - file_embeddings: 30 MB (vector search)
--   - file_chunks: 9.6 MB (content)
--   - search_index: 3 MB (search performance)
--   - course_files: 128 kB (primary files)
--   - files: 56 kB (legacy, empty)
-- Active Systems: Learning, Annotations, Progress, AI Tracking
-- ============================================================================ 