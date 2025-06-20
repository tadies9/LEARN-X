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
    id: string; // courseId
    fileId: string; // specific file to study
  };
}

export default async function StudyPage({ params }: StudyPageProps) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('User not authenticated:', userError);
    notFound();
  }

  // Fetch course data
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, user_id')
    .eq('id', params.id)
    .single();

  if (courseError || !course) {
    console.error('Course not found:', { courseId: params.id, error: courseError });
    notFound();
  }

  // Check if user has access to the course
  if (course.user_id !== user.id) {
    notFound();
  }

  // Fetch file data
  const { data: file, error: fileError } = await supabase
    .from('course_files')
    .select(
      `
      id,
      name,
      original_name,
      storage_path,
      mime_type,
      status,
      metadata,
      module_id,
      course_id
    `
    )
    .eq('id', params.fileId)
    .single();

  if (fileError || !file) {
    console.error('File not found:', { fileId: params.fileId, error: fileError });
    notFound();
  }

  // Fetch module data if file has a module
  let moduleTitle: string | undefined;
  if (file.module_id) {
    const { data: module } = await supabase
      .from('modules')
      .select('title')
      .eq('id', file.module_id)
      .single();

    moduleTitle = module?.title;
  }

  // Check if file is processed and ready
  if (file.status !== 'processed') {
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
  const { data: personaData } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Transform to UserPersona format if exists
  const persona = personaData
    ? {
        id: personaData.id,
        userId: personaData.user_id,
        primaryInterests: personaData.personal_interests?.primary || [],
        secondaryInterests: personaData.personal_interests?.secondary || [],
        currentRole: personaData.professional_context?.role,
        industry: personaData.professional_context?.industry,
        technicalLevel: personaData.professional_context?.technicalLevel,
        learningStyle: personaData.learning_style?.primary,
        communicationTone: personaData.communication_tone?.style,
        createdAt: new Date(personaData.created_at),
        updatedAt: new Date(personaData.updated_at),
      }
    : null;

  // Generate signed URL for the file using backend API
  let fileUrl = '';
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/files/${params.fileId}/signed-url`,
      {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      fileUrl = data.data.url;
    } else {
      console.error('Failed to get signed URL:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error fetching signed URL:', error);
  }

  return (
    <StudyLayout
      courseId={params.id}
      courseTitle={course.title}
      fileId={params.fileId}
      fileName={file.name}
      fileUrl={fileUrl}
      fileType={file.mime_type}
      moduleTitle={moduleTitle}
      userId={user.id}
      userPersona={persona}
    />
  );
}
