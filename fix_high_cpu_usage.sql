-- Migration to fix high CPU usage issues in LEARN-X project
-- This addresses the critical performance problems identified by Supabase advisors

-- =====================================================
-- 1. FIX RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- =====================================================

-- Fix user_preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
CREATE POLICY "Users can create their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Fix user_progress policies
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
CREATE POLICY "Users can update their own progress" ON public.user_progress
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own progress" ON public.user_progress;
CREATE POLICY "Users can create their own progress" ON public.user_progress
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Fix generation_jobs policies
DROP POLICY IF EXISTS "Users can view own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users can view own generation jobs" ON public.generation_jobs
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users can create own generation jobs" ON public.generation_jobs
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Fix notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix personas policies
DROP POLICY IF EXISTS "Users can view their own persona" ON public.personas;
CREATE POLICY "Users can view their own persona" ON public.personas
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own persona" ON public.personas;
CREATE POLICY "Users can insert their own persona" ON public.personas
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own persona" ON public.personas;
CREATE POLICY "Users can update their own persona" ON public.personas
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own persona" ON public.personas;
CREATE POLICY "Users can delete their own persona" ON public.personas
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix course_files policies
DROP POLICY IF EXISTS "Users can view files in their courses" ON public.course_files;
CREATE POLICY "Users can view files in their courses" ON public.course_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_files.course_id 
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can upload files to their courses" ON public.course_files;
CREATE POLICY "Users can upload files to their courses" ON public.course_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_files.course_id 
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their course files" ON public.course_files;
CREATE POLICY "Users can update their course files" ON public.course_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_files.course_id 
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their course files" ON public.course_files;
CREATE POLICY "Users can delete their course files" ON public.course_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_files.course_id 
      AND courses.user_id = (select auth.uid())
    )
  );

-- Fix file_chunks policies
DROP POLICY IF EXISTS "Users can view chunks of their files" ON public.file_chunks;
CREATE POLICY "Users can view chunks of their files" ON public.file_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_files cf
      JOIN public.courses c ON c.id = cf.course_id
      WHERE cf.id = file_chunks.file_id 
      AND c.user_id = (select auth.uid())
    )
  );

-- Fix annotations policies
DROP POLICY IF EXISTS "Users can view own annotations" ON public.annotations;
CREATE POLICY "Users can view own annotations" ON public.annotations
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own annotations" ON public.annotations;
CREATE POLICY "Users can create own annotations" ON public.annotations
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own annotations" ON public.annotations;
CREATE POLICY "Users can update own annotations" ON public.annotations
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own annotations" ON public.annotations;
CREATE POLICY "Users can delete own annotations" ON public.annotations
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix persona_history policies
DROP POLICY IF EXISTS "Users can view their own persona history" ON public.persona_history;
CREATE POLICY "Users can view their own persona history" ON public.persona_history
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own persona history" ON public.persona_history;
CREATE POLICY "Users can insert their own persona history" ON public.persona_history
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Fix user_activities policies
DROP POLICY IF EXISTS "Users can view their own activities" ON public.user_activities;
CREATE POLICY "Users can view their own activities" ON public.user_activities
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own activities" ON public.user_activities;
CREATE POLICY "Users can create their own activities" ON public.user_activities
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Fix generation_results policies
DROP POLICY IF EXISTS "Users can view results for own jobs" ON public.generation_results;
CREATE POLICY "Users can view results for own jobs" ON public.generation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.generation_jobs gj
      WHERE gj.id = generation_results.job_id 
      AND gj.user_id = (select auth.uid())
    )
  );

-- Fix onboarding_analytics policies
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.onboarding_analytics;
CREATE POLICY "Users can insert own analytics" ON public.onboarding_analytics
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own analytics" ON public.onboarding_analytics;
CREATE POLICY "Users can view own analytics" ON public.onboarding_analytics
  FOR SELECT USING (user_id = (select auth.uid()));

-- =====================================================
-- 2. ADD MISSING INDEXES
-- =====================================================

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_generation_jobs_course_id 
  ON public.generation_jobs(course_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_file_id 
  ON public.user_progress(file_id);

-- =====================================================
-- 3. REMOVE DUPLICATE INDEXES
-- =====================================================

-- Drop duplicate indexes in file_chunks
DROP INDEX IF EXISTS public.idx_file_chunks_file_status;

-- Drop duplicate indexes in file_embeddings
DROP INDEX IF EXISTS public.file_embeddings_chunk_id_idx;

-- Drop duplicate indexes in modules
DROP INDEX IF EXISTS public.idx_modules_course;

-- Drop duplicate indexes in study_sessions
DROP INDEX IF EXISTS public.idx_sessions_file;

-- =====================================================
-- 4. OPTIMIZE COMMONLY USED QUERIES
-- =====================================================

-- Add composite indexes for frequent query patterns
CREATE INDEX IF NOT EXISTS idx_user_progress_user_file 
  ON public.user_progress(user_id, file_id);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_status 
  ON public.generation_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications(user_id, is_read);

-- =====================================================
-- 5. ANALYZE TABLES TO UPDATE STATISTICS
-- =====================================================

ANALYZE public.user_preferences;
ANALYZE public.user_progress;
ANALYZE public.generation_jobs;
ANALYZE public.generation_results;
ANALYZE public.notifications;
ANALYZE public.personas;
ANALYZE public.course_files;
ANALYZE public.file_chunks;
ANALYZE public.annotations;
ANALYZE public.persona_history;
ANALYZE public.user_activities;
ANALYZE public.onboarding_analytics;
ANALYZE public.courses;
ANALYZE public.files;
ANALYZE public.modules;
ANALYZE public.study_sessions;