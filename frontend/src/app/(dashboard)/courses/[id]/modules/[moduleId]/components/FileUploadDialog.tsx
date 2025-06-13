'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ButtonLoader } from '@/components/ui/ButtonLoader';
import { FileUpload } from '@/components/ui/FileUpload';
import { useToast } from '@/components/ui/use-toast';
import { fileApi } from '@/lib/api/file';
import { Upload } from 'lucide-react';

interface FileUploadDialogProps {
  moduleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FileUploadDialog({
  moduleId,
  open,
  onOpenChange,
  onSuccess,
}: FileUploadDialogProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (const file of selectedFiles) {
        await fileApi.uploadFile(moduleId, file, {});
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      toast({
        title: 'Files uploaded',
        description: `Successfully uploaded ${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}.`,
      });

      onSuccess();
      onOpenChange(false);
      setSelectedFiles([]);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Course Materials</DialogTitle>
          <DialogDescription>
            Add PDF, PowerPoint, Word documents, or text files to this module
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FileUpload
            onUpload={handleFilesSelected}
            disabled={uploading}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedFiles([]);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
              <ButtonLoader loading={uploading} loadingText="Uploading...">
                <Upload className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
              </ButtonLoader>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
