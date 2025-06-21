'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';
import { fileApi } from '@/lib/api/FileApiService';
import { cn } from '@/lib/utils';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleTitle: string;
  onUploadComplete: () => void;
}

const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/x-ms-wmv': ['.wmv'],
};

export function FileUploadDialog({
  open,
  onOpenChange,
  moduleId,
  moduleTitle,
  onUploadComplete,
}: FileUploadDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await fileApi.uploadFile(selectedFile, { 
        moduleId,
        name: selectedFile.name.split('.')[0],
        description: description || undefined
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      // Reset form
      setSelectedFile(null);
      setFileName('');
      setDescription('');
      setUploadProgress(0);

      onUploadComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload File to {moduleTitle}</DialogTitle>
          <DialogDescription>
            Upload course materials like PDFs, documents, presentations, or videos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to select'}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, PPT, TXT, MD, Images, Videos (max 100MB)
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-8 w-8 text-muted-foreground mt-1" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile} disabled={uploading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {selectedFile && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fileName">File Name</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter a custom name for this file"
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a brief description of this file"
                  rows={3}
                  disabled={uploading}
                />
              </div>
            </>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload File'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
