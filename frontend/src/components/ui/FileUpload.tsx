'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Cloud, File, X } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
}

export function FileUpload({
  onUpload,
  accept = {
    'application/pdf': ['.pdf'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  disabled = false,
  uploading = false,
  uploadProgress = 0,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || uploading) return;

      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      setFiles(newFiles);
      onUpload(acceptedFiles);
    },
    [files, maxFiles, disabled, uploading, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - files.length,
    disabled: disabled || uploading,
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          'relative overflow-hidden border-2 border-dashed p-8 text-center transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          (disabled || uploading) && 'cursor-not-allowed opacity-50',
          !disabled && !uploading && 'cursor-pointer hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />

        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <Cloud className="h-10 w-10 text-muted-foreground mb-4" />

          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop the files here...</p>
          ) : (
            <>
              <h3 className="text-sm font-medium">Drag & drop files here, or click to select</h3>
              <p className="text-xs text-muted-foreground mt-2">
                Supports PDF, PPT, PPTX, DOC, DOCX, TXT, and MD files up to {maxSize / 1024 / 1024}
                MB
              </p>
            </>
          )}
        </div>

        {uploading && uploadProgress > 0 && (
          <Progress
            value={uploadProgress}
            className="absolute bottom-0 left-0 h-1 w-full rounded-none"
          />
        )}
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected files</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
