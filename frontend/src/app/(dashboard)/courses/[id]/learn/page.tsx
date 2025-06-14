'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { LearningLayout } from '@/components/layouts/LearningLayout';
import { createClient } from '@/lib/supabase/client';

export default function LearnPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName');
  const courseId = params.id;

  const [fileUrl, setFileUrl] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState<string>('Course');
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Use ref to track if we've already loaded this specific file/course combination
  const loadedRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Prevent excessive retries
    if (loadAttempts > 3) {
      console.log('[LearnPage] Max load attempts reached');
      setError('Failed to load file after multiple attempts');
      setIsLoading(false);
      return;
    }

    // Create unique key for this file/course combination
    const loadKey = `${fileId}-${courseId}`;

    // If no fileId or courseId, set loading to false and return
    if (!fileId || !courseId) {
      console.log('[LearnPage] Missing fileId or courseId');
      setIsLoading(false);
      return;
    }

    // If we already loaded this exact combination and have a URL, don't load again
    if (loadedRef.current === loadKey && fileUrl) {
      console.log('[LearnPage] Data already loaded for:', { fileId, courseId });
      setIsLoading(false);
      return;
    }

    console.log('[LearnPage] Loading file data for:', {
      fileId,
      courseId,
      attempt: loadAttempts + 1,
    });

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set loading state
    setIsLoading(true);
    setError(null);

    // Load data function
    const loadData = async () => {
      try {
        setLoadAttempts((prev) => prev + 1);
        const supabase = createClient();

        // Fetch course and file data in parallel
        const [courseResult, fileResult] = await Promise.all([
          supabase.from('courses').select('title').eq('id', courseId).single(),
          supabase
            .from('course_files')
            .select('id, storage_path, mime_type, status')
            .eq('id', fileId)
            .single(),
        ]);

        // Check if request was aborted or component unmounted
        if (abortController.signal.aborted || !isMountedRef.current) {
          console.log('[LearnPage] Request aborted or component unmounted');
          return;
        }

        // Handle course data
        if (courseResult.data) {
          setCourseTitle(courseResult.data.title);
        }

        // Handle file data
        if (fileResult.error || !fileResult.data) {
          throw new Error(`File not found: ${fileResult.error?.message || 'Unknown error'}`);
        }

        const file = fileResult.data;
        setFileMimeType(file.mime_type || '');

        console.log('[LearnPage] File found:', {
          id: file.id,
          storage_path: file.storage_path,
          status: file.status,
        });

        // Generate signed URL using Supabase's recommended approach
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('course-files')
          .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

        // Check if request was aborted or component unmounted
        if (abortController.signal.aborted || !isMountedRef.current) {
          console.log('[LearnPage] Request aborted after URL generation or component unmounted');
          return;
        }

        if (urlError || !signedUrlData?.signedUrl) {
          console.warn('[LearnPage] Supabase signed URL failed:', urlError);

          // Fallback to backend endpoint only if Supabase fails
          try {
            console.log('[LearnPage] Trying backend fallback...');
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}/working-signed-url`,
              {
                signal: abortController.signal,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              console.error('[LearnPage] Backend response error:', errorData);
              throw new Error(errorData.error || 'Backend request failed');
            }

            const data = await response.json();
            if (data.success && data.data?.url) {
              setFileUrl(data.data.url);
              console.log('[LearnPage] Backend fallback successful');
              // Mark as loaded
              loadedRef.current = loadKey;
              setIsLoading(false);
              return;
            }
            throw new Error('Backend returned no URL');
          } catch (backendError: any) {
            if (abortController.signal.aborted || !isMountedRef.current) return;
            console.error('[LearnPage] Backend fallback failed:', backendError);
            throw new Error(`Unable to generate file URL: ${backendError.message}`);
          }
        } else {
          setFileUrl(signedUrlData.signedUrl);
          console.log('[LearnPage] Supabase signed URL successful');
          // Mark as loaded
          loadedRef.current = loadKey;
        }
      } catch (err) {
        if (abortController.signal.aborted || !isMountedRef.current) {
          console.log('[LearnPage] Request was aborted or component unmounted');
          return;
        }
        console.error('[LearnPage] Error loading file data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
        // Mark this combination as attempted to prevent infinite retries
        loadedRef.current = loadKey;
      } finally {
        // Only set loading to false if this request wasn't aborted and component is still mounted
        if (!abortController.signal.aborted && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Execute the load function
    loadData();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fileId, courseId, fileUrl, loadAttempts]); // Include dependencies

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Loading Course Content</h2>
          <p className="text-muted-foreground">Preparing your learning materials...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Unable to Load Content</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => {
              // Reset state and reload
              loadedRef.current = '';
              setError(null);
              setFileUrl('');
              setIsLoading(true);
              setLoadAttempts(0);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Use fallback PDF if no URL is available
  const pdfUrl =
    fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  return (
    <LearningLayout
      courseId={courseId}
      courseTitle={courseTitle}
      pdfUrl={pdfUrl}
      fileId={fileId}
      fileName={fileName}
      fileMimeType={fileMimeType}
    />
  );
}
