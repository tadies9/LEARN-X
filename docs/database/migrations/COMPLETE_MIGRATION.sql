-- Complete Migration for LEARN-X
-- This creates all missing tables that the backend expects

-- First, let's create course_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.course_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    status file_status DEFAULT 'pending',
    processing_error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_course_files_course_id (course_id),
    INDEX idx_course_files_module_id (module_id),
    INDEX idx_course_files_status (status)
);

-- Create file_chunks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.file_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.course_files(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_file_chunk UNIQUE(file_id, chunk_index),
    INDEX idx_file_chunks_file_id (file_id)
);

-- Create chunk_embeddings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id UUID NOT NULL REFERENCES public.file_chunks(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI embeddings dimension
    model VARCHAR(50) DEFAULT 'text-embedding-ada-002',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_chunk_embedding UNIQUE(chunk_id),
    INDEX idx_chunk_embeddings_chunk_id (chunk_id)
);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_vector ON public.chunk_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_read (read),
    INDEX idx_notifications_created_at (created_at DESC)
);

-- Enable RLS on all tables
ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunk_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_files
CREATE POLICY "Users can view files in their courses" ON public.course_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_files.course_id 
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload files to their courses" ON public.course_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_files.course_id 
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their course files" ON public.course_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_files.course_id 
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their course files" ON public.course_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_files.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- RLS Policies for file_chunks
CREATE POLICY "Users can view chunks of their files" ON public.file_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_files
            JOIN public.courses ON courses.id = course_files.course_id
            WHERE course_files.id = file_chunks.file_id 
            AND courses.user_id = auth.uid()
        )
    );

-- RLS Policies for chunk_embeddings
CREATE POLICY "Users can view embeddings of their chunks" ON public.chunk_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.file_chunks
            JOIN public.course_files ON course_files.id = file_chunks.file_id
            JOIN public.courses ON courses.id = course_files.course_id
            WHERE file_chunks.id = chunk_embeddings.chunk_id 
            AND courses.user_id = auth.uid()
        )
    );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true); -- Will be restricted by backend service role

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_course_files_updated_at BEFORE UPDATE ON public.course_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();