-- Create storage bucket for course files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- RLS policies for course files bucket
CREATE POLICY "Users can upload files to their courses" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'course-files' AND
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE courses.user_id = auth.uid()
      AND modules.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can view files in accessible courses" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'course-files' AND
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id::text = (storage.foldername(name))[1]
      AND (courses.user_id = auth.uid() OR courses.is_public = true)
    )
  );

CREATE POLICY "Users can update their own course files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'course-files' AND
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE courses.user_id = auth.uid()
      AND modules.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can delete their own course files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'course-files' AND
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE courses.user_id = auth.uid()
      AND modules.id::text = (storage.foldername(name))[1]
    )
  );

-- Create temporary uploads bucket for processing
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'temp-uploads',
  'temp-uploads',
  false,
  52428800 -- 50MB limit
);

-- RLS policies for temp uploads (more restrictive)
CREATE POLICY "Users can upload to temp" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'temp-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their temp files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'temp-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their temp files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'temp-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );