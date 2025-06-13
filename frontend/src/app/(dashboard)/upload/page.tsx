'use client';

import { useState } from 'react';

import { UploadHeader } from './components/UploadHeader';
import { FileDropzone } from './components/FileDropzone';
import { ProcessingIndicator } from './components/ProcessingIndicator';
import { UploadedFilesList } from './components/UploadedFilesList';
import { UploadSidebar } from './components/UploadSidebar';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'completed';
  aiStatus: 'queued' | 'personalized';
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileDrop = (acceptedFiles: File[]) => {
    // Simulate file processing
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing' as const,
      aiStatus: 'queued' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate processing progress
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          
          // Mark files as completed
          setUploadedFiles(current => 
            current.map(file => 
              newFiles.some(nf => nf.id === file.id) 
                ? { ...file, status: 'completed', aiStatus: 'personalized' }
                : file
            )
          );
          
          return 100;
        }
        return newProgress;
      });
    }, 300);
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

          <UploadedFilesList files={uploadedFiles} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <UploadSidebar />
        </div>
      </div>
    </div>
  );
}