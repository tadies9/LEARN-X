import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StudyLayout } from '@/components/study/StudyLayout';

export const metadata: Metadata = {
  title: 'Study Mode - LEARN-X',
  description: 'AI-powered personalized study experience',
};

interface StudyPageProps {
  params: {
    id: string;     // courseId
    fileId: string; // specific file to study
  };
}

export default async function StudyPage({ params }: StudyPageProps) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Fetch course data
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, user_id')
    .eq('id', params.id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // Check if user has access to the course
  if (course.user_id !== user.id) {
    notFound();
  }

  // Fetch file data
  const { data: file, error: fileError } = await supabase
    .from('course_files')
    .select(`
      id,
      name,
      file_path,
      file_type,
      file_url,
      status,
      embedding_status,
      module:course_modules(
        id,
        title
      )
    `)
    .eq('id', params.fileId)
    .single();

  if (fileError || !file) {
    notFound();
  }

  // Check if file is processed and ready
  if (file.status !== 'processed' || file.embedding_status !== 'completed') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">File Processing</h2>
          <p className="text-muted-foreground">
            This file is still being processed. Please check back in a few moments.
          </p>
        </div>
      </div>
    );
  }

  // Fetch user persona for personalization
  const { data: persona } = await supabase
    .from('user_personas')
    .select('*')
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  return (
    <StudyLayout
      courseId={params.id}
      courseTitle={course.title}
      fileId={params.fileId}
      fileName={file.name}
      fileUrl={file.file_url}
      fileType={file.file_type}
      moduleTitle={file.module?.title}
      userId={user.id}
      userPersona={persona}
    />
  );
}