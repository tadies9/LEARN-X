'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UploadHeader } from './components/UploadHeader';
import { FileDropzone } from './components/FileDropzone';
import { ProcessingIndicator } from './components/ProcessingIndicator';
import { UploadedFilesList } from './components/UploadedFilesList';
import { UploadSidebar } from './components/UploadSidebar';
import { FileApiService, type UploadedFile, type FileProcessingStatus } from '@/lib/api/files';

export default function UploadPage() {
  const searchParams = useSearchParams();
  const { session } = useAuth();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [activeProcessingFiles, setActiveProcessingFiles] = useState<Set<string>>(new Set());
  
  const courseId = searchParams.get('courseId') || 'default';
  const moduleId = searchParams.get('moduleId') || undefined;
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  // Load existing files on mount
  useEffect(() => {
    if (session && courseId) {
      loadExistingFiles();
    }
  }, [session, courseId]);

  const loadExistingFiles = async () => {
    try {
      const files = await FileApiService.getFiles(courseId);
      setUploadedFiles(files);
    } catch (error) {
      console.error('Failed to load existing files:', error);
    }
  };

  const handleFileDrop = async (acceptedFiles: File[]) => {
    if (!session?.access_token) {
      console.error('No authentication token available');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    for (const file of acceptedFiles) {
      try {
        // Upload file and start processing
        const uploadedFile = await FileApiService.uploadFile(
          file,
          courseId,
          moduleId,
          (progress) => {
            setProcessingProgress(progress);
          }
        );

        // Add file to state
        setUploadedFiles(prev => [...prev, uploadedFile]);
        setActiveProcessingFiles(prev => new Set([...prev, uploadedFile.id]));

        // Start listening to processing updates
        startProcessingUpdates(uploadedFile.id, session.access_token);

      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        
        // Add failed file to state
        const failedFile: UploadedFile = {
          id: `failed-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'error',
          progress: 0,
          error: 'Upload failed',
          uploadedAt: new Date().toISOString()
        };
        
        setUploadedFiles(prev => [...prev, failedFile]);
      }
    }

    setIsProcessing(false);
    setProcessingProgress(100);
  };

  const startProcessingUpdates = (fileId: string, token: string) => {
    const url = FileApiService.getProcessingUpdatesUrl(fileId, token);
    const eventSource = new EventSource(url);
    
    eventSourcesRef.current.set(fileId, eventSource);

    eventSource.onmessage = (event) => {
      const update: FileProcessingStatus = JSON.parse(event.data);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId 
            ? {
                ...file,
                status: update.status as any,
                progress: update.progress,
                processingStage: update.stage as any,
                chunkCount: update.chunksGenerated,
                embeddingCount: update.embeddingsGenerated,
                error: update.error
              }
            : file
        )
      );

      // If processing is complete, close the event source
      if (update.status === 'completed' || update.status === 'error') {
        eventSource.close();
        eventSourcesRef.current.delete(fileId);
        setActiveProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error('Processing updates error for file:', fileId, error);
      eventSource.close();
      eventSourcesRef.current.delete(fileId);
      setActiveProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    };
  };

  // Cleanup event sources on unmount
  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach(eventSource => {
        eventSource.close();
      });
      eventSourcesRef.current.clear();
    };
  }, []);

  const retryProcessing = async (fileId: string) => {
    try {
      await FileApiService.retryProcessing(fileId);
      
      // Start listening to updates again
      if (session?.access_token) {
        startProcessingUpdates(fileId, session.access_token);
        setActiveProcessingFiles(prev => new Set([...prev, fileId]));
      }
    } catch (error) {
      console.error('Failed to retry processing:', error);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      await FileApiService.deleteFile(fileId);
      
      // Remove from state
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      
      // Close any active event source
      const eventSource = eventSourcesRef.current.get(fileId);
      if (eventSource) {
        eventSource.close();
        eventSourcesRef.current.delete(fileId);
      }
      
      setActiveProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <UploadHeader />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <FileDropzone onDrop={handleFileDrop} />

          {isProcessing && (
            <ProcessingIndicator progress={processingProgress} />
          )}

          <UploadedFilesList 
            files={uploadedFiles} 
            onRetry={retryProcessing}
            onDelete={deleteFile}
            activeProcessingFiles={activeProcessingFiles}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <UploadSidebar 
            totalFiles={uploadedFiles.length}
            processingFiles={activeProcessingFiles.size}
            completedFiles={uploadedFiles.filter(f => f.status === 'completed').length}
            errorFiles={uploadedFiles.filter(f => f.status === 'error').length}
          />
        </div>
      </div>
    </div>
  );
}