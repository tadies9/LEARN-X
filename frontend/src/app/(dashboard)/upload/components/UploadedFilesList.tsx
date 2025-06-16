import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Trash2,
  Clock,
  Loader2,
} from 'lucide-react';

import { getFileIcon, formatFileSize } from '../utils/fileHelpers';
import type { UploadedFile } from '@/lib/api/files';
import { FileProcessingDebug } from '@/components/debug/FileProcessingDebug';

interface UploadedFilesListProps {
  files: UploadedFile[];
  onRetry?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  activeProcessingFiles?: Set<string>;
}

export function UploadedFilesList({
  files,
  onRetry,
  onDelete,
  activeProcessingFiles,
}: UploadedFilesListProps) {
  if (files.length === 0) {
    return null;
  }

  const getStatusBadge = (file: UploadedFile) => {
    const isActivelyProcessing = activeProcessingFiles?.has(file.id);

    if (isActivelyProcessing) {
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    }

    switch (file.status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'processing':
      case 'chunking':
      case 'embedding':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {file.processingStage || file.status}
          </Badge>
        );
      default:
        return <Badge variant="outline">{file.status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>Your uploaded content and processing status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div key={file.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {file.chunkCount && file.chunkCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{file.chunkCount} chunks</span>
                        </>
                      )}
                      {file.embeddingCount && file.embeddingCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{file.embeddingCount} embeddings</span>
                        </>
                      )}
                    </div>
                    {file.error && <p className="text-sm text-destructive mt-1">{file.error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(file)}

                    {/* Action buttons */}
                    {file.status === 'error' && onRetry && (
                      <Button size="sm" variant="outline" onClick={() => onRetry(file.id)}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}

                    {onDelete && (
                      <Button size="sm" variant="ghost" onClick={() => onDelete(file.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Debug component for error files */}
                {(file.status === 'error' || file.status === 'processing') && (
                  <FileProcessingDebug
                    fileId={file.id}
                    fileName={file.name}
                    currentStatus={file.status}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
