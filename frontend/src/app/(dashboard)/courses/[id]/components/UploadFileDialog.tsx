'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/useToast';
import { fileApi } from '@/lib/api/FileApiService';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

interface UploadFileDialogProps {
  moduleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function UploadFileDialog({
  moduleId,
  open,
  onOpenChange,
  onSuccess,
}: UploadFileDialogProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      return Object.assign(file, {
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    });

    // Initialize default names for all new files at once
    const newFileNames: Record<string, string> = {};
    const newFileDescriptions: Record<string, string> = {};

    acceptedFiles.forEach((file) => {
      newFileNames[file.name] = file.name;
      newFileDescriptions[file.name] = '';
    });

    setFileNames((prev) => ({ ...prev, ...newFileNames }));
    setFileDescriptions((prev) => ({ ...prev, ...newFileDescriptions }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.wmv'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
    setFileNames((prev) => {
      const newNames = { ...prev };
      delete newNames[fileName];
      return newNames;
    });
    setFileDescriptions((prev) => {
      const newDescriptions = { ...prev };
      delete newDescriptions[fileName];
      return newDescriptions;
    });
  };

  const updateFileName = (originalName: string, newName: string) => {
    setFileNames((prev) => ({ ...prev, [originalName]: newName }));
  };

  const updateFileDescription = (fileName: string, description: string) => {
    setFileDescriptions((prev) => ({ ...prev, [fileName]: description }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        const fileName = fileNames[file.name] || file.name;
        const description = fileDescriptions[file.name] || '';

        await fileApi.uploadFile(file, {
          moduleId,
          name: fileName,
          description,
          processingOptions: {
            extractText: true,
            generateThumbnail: true,
            transcribe: false,
          },
        });

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      toast({
        title: 'Files uploaded successfully',
        description: `${files.length} file(s) have been uploaded and are being processed.`,
      });

      // Reset form
      setFiles([]);
      setFileNames({});
      setFileDescriptions({});
      setUploadProgress(0);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setFileNames({});
      setFileDescriptions({});
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Files to Module</DialogTitle>
          <DialogDescription>
            Upload documents, images, videos, and other course materials to this module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, Word, PowerPoint, images, videos, and text files (max 100MB each)
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Files to upload ({files.length})</h4>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {file.type.startsWith('image/') && file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.type}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.name)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label htmlFor={`name-${index}`} className="text-xs">
                              Display Name
                            </Label>
                            <Input
                              id={`name-${index}`}
                              value={fileNames[file.name] || ''}
                              onChange={(e) => updateFileName(file.name, e.target.value)}
                              placeholder="Enter display name"
                              className="h-8"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`description-${index}`} className="text-xs">
                              Description (optional)
                            </Label>
                            <Textarea
                              id={`description-${index}`}
                              value={fileDescriptions[file.name] || ''}
                              onChange={(e) => updateFileDescription(file.name, e.target.value)}
                              placeholder="Enter file description"
                              className="h-16 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading files...</span>
                <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Processing Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">AI Processing</p>
              <p className="text-blue-700">
                Uploaded files will be automatically processed to generate summaries and extract key
                points.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
