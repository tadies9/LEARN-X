import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

import { getFileIcon, formatFileSize } from '../utils/fileHelpers';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'completed';
  aiStatus: 'queued' | 'personalized';
}

interface UploadedFilesListProps {
  files: UploadedFile[];
}

export function UploadedFilesList({ files }: UploadedFilesListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>Your uploaded content and personalization status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <FileIcon className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'completed' ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Processing
                    </Badge>
                  )}
                  
                  {file.aiStatus === 'personalized' && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Personalized
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}