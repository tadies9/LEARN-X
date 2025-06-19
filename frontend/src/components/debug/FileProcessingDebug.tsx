'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { FileApiService } from '@/lib/api/files';
import type { FileProcessingStatus } from '@/lib/api/files';

interface FileProcessingDebugProps {
  fileId: string;
  fileName: string;
  currentStatus: string;
}

export function FileProcessingDebug({ fileId, currentStatus }: FileProcessingDebugProps) {
  const [status, setStatus] = useState<FileProcessingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const statusData = await FileApiService.getProcessingStatus(fileId);
      setStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const retryProcessing = async () => {
    setLoading(true);
    setError(null);

    try {
      await FileApiService.retryProcessing(fileId);
      setError(null);
      // Check status after retry
      setTimeout(checkStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry processing');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
      case 'chunking':
      case 'embedding':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="mt-2 border-dashed">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={checkStatus} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
            {currentStatus === 'error' && (
              <Button size="sm" variant="default" onClick={retryProcessing} disabled={loading}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {(status || error) && (
        <CardContent className="pt-0">
          {error && (
            <div className="mb-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
              {error}
            </div>
          )}

          {status && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={status.status === 'completed' ? 'default' : 'secondary'}>
                  {status.status}
                </Badge>
              </div>

              {status.progress !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress:</span>
                  <span>{status.progress}%</span>
                </div>
              )}

              {status.stage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stage:</span>
                  <span>{status.stage}</span>
                </div>
              )}

              {status.chunksGenerated !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chunks:</span>
                  <span>
                    {status.chunksGenerated} / {status.totalChunks || '?'}
                  </span>
                </div>
              )}

              {status.embeddingsGenerated !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Embeddings:</span>
                  <span>{status.embeddingsGenerated}</span>
                </div>
              )}

              {status.processingTime !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{(status.processingTime / 1000).toFixed(1)}s</span>
                </div>
              )}

              {status.error && (
                <div className="mt-2 p-2 bg-destructive/10 rounded">
                  <p className="font-medium text-destructive">Error:</p>
                  <p className="text-destructive/80">{status.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
