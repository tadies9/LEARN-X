-- Supabase Storage Setup for Avatars
-- This script creates a storage bucket for user avatars with appropriate RLS policies

-- Enable the storage extension if not already enabled
-- Note: This is typically already enabled in Supabase projects

-- Insert the avatars bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Policy 1: Allow public read access to all avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy 2: Allow authenticated users to upload their own avatar
-- The path should follow the pattern: user_id/filename
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

-- Policy 3: Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

-- Policy 4: Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

-- Optional: Set file size limit and allowed MIME types
-- This would typically be configured in the Supabase dashboard
-- but here's an example of how you might validate in your application:

-- Example validation (not SQL, but for reference in your application code):
-- Max file size: 5MB (5 * 1024 * 1024 bytes)
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- Usage notes:
-- 1. Users should upload avatars to: avatars/{user_id}/filename.ext
-- 2. Example path: avatars/123e4567-e89b-12d3-a456-426614174000/profile.jpg
-- 3. The public URL will be: https://your-project.supabase.co/storage/v1/object/public/avatars/{user_id}/filename.ext

-- Additional considerations:
-- 1. You may want to implement a cloud function to automatically resize avatars
-- 2. Consider implementing a naming convention to prevent conflicts
-- 3. You might want to limit each user to a single avatar file