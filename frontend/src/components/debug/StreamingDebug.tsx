'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  XCircle,
  Activity,
  Download,
  Trash2
} from 'lucide-react';

interface StreamEvent {
  timestamp: Date;
  type: 'start' | 'data' | 'error' | 'complete' | 'abort';
  data?: any;
  size?: number;
  chunkIndex?: number;
}

interface StreamingDebugProps {
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  activeMode: string;
  fileId: string | null;
}

export function StreamingDebug({ 
  isStreaming, 
  streamingContent, 
  error, 
  activeMode,
  fileId 
}: StreamingDebugProps) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [stats, setStats] = useState({
    totalChunks: 0,
    totalSize: 0,
    duplicateChunks: 0,
    emptyChunks: 0,
    errorCount: 0,
    startTime: null as Date | null,
    endTime: null as Date | null,
    duration: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Track streaming events
  useEffect(() => {
    if (isStreaming && !stats.startTime) {
      const startEvent: StreamEvent = {
        timestamp: new Date(),
        type: 'start',
        data: { mode: activeMode, fileId }
      };
      setEvents(prev => [...prev, startEvent]);
      setStats(prev => ({ ...prev, startTime: new Date() }));
    }
  }, [isStreaming, stats.startTime, activeMode, fileId]);

  // Track content changes
  useEffect(() => {
    if (streamingContent && isStreaming) {
      const event: StreamEvent = {
        timestamp: new Date(),
        type: 'data',
        data: streamingContent.slice(-100), // Last 100 chars
        size: streamingContent.length,
        chunkIndex: stats.totalChunks
      };
      setEvents(prev => [...prev, event]);
      setStats(prev => ({
        ...prev,
        totalChunks: prev.totalChunks + 1,
        totalSize: streamingContent.length
      }));
    }
  }, [streamingContent]);

  // Track completion
  useEffect(() => {
    if (!isStreaming && stats.startTime && !stats.endTime) {
      const endTime = new Date();
      const duration = endTime.getTime() - stats.startTime.getTime();
      
      const completeEvent: StreamEvent = {
        timestamp: endTime,
        type: 'complete',
        data: { duration, finalSize: streamingContent.length }
      };
      
      setEvents(prev => [...prev, completeEvent]);
      setStats(prev => ({ 
        ...prev, 
        endTime,
        duration
      }));
    }
  }, [isStreaming, stats.startTime, stats.endTime, streamingContent.length]);

  // Track errors
  useEffect(() => {
    if (error) {
      const errorEvent: StreamEvent = {
        timestamp: new Date(),
        type: 'error',
        data: error
      };
      setEvents(prev => [...prev, errorEvent]);
      setStats(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
    }
  }, [error]);

  const clearDebugData = () => {
    setEvents([]);
    setStats({
      totalChunks: 0,
      totalSize: 0,
      duplicateChunks: 0,
      emptyChunks: 0,
      errorCount: 0,
      startTime: null,
      endTime: null,
      duration: 0,
    });
  };

  const exportDebugData = () => {
    const debugData = {
      events,
      stats,
      metadata: {
        exportTime: new Date().toISOString(),
        activeMode,
        fileId,
        contentLength: streamingContent.length
      }
    };
    
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `streaming-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    if (error) return 'text-destructive';
    if (isStreaming) return 'text-blue-600';
    if (stats.endTime) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getStatusIcon = () => {
    if (error) return <XCircle className="h-4 w-4" />;
    if (isStreaming) return <Activity className="h-4 w-4 animate-pulse" />;
    if (stats.endTime) return <CheckCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Debug Streaming
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[400px] max-h-[600px] shadow-lg">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={getStatusColor()}>{getStatusIcon()}</div>
            <CardTitle className="text-sm">Streaming Debug</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={exportDebugData}
              title="Export debug data"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={clearDebugData}
              title="Clear debug data"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              title="Minimize"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">
                  {isStreaming ? 'Streaming' : stats.endTime ? 'Complete' : 'Idle'}
                </p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Mode</p>
                <p className="font-medium">{activeMode}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Chunks</p>
                <p className="font-medium">{stats.totalChunks}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Size</p>
                <p className="font-medium">{(stats.totalSize / 1024).toFixed(1)} KB</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {stats.duration ? `${(stats.duration / 1000).toFixed(1)}s` : '-'}
                </p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Errors</p>
                <p className="font-medium text-destructive">{stats.errorCount}</p>
              </div>
            </div>
            
            {error && (
              <div className="p-2 bg-destructive/10 rounded text-xs">
                <p className="font-medium text-destructive">Last Error:</p>
                <p className="text-destructive/80">{error}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="events" className="mt-2">
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {events.slice(-20).reverse().map((event, idx) => (
                <div key={idx} className="text-xs p-2 bg-muted rounded flex items-start gap-2">
                  <Badge 
                    variant={
                      event.type === 'error' ? 'destructive' : 
                      event.type === 'complete' ? 'default' : 
                      'secondary'
                    }
                    className="text-xs"
                  >
                    {event.type}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                    {event.data && (
                      <p className="font-mono text-xs mt-1 break-all">
                        {typeof event.data === 'string' 
                          ? event.data.slice(0, 100) 
                          : JSON.stringify(event.data).slice(0, 100)}
                      </p>
                    )}
                    {event.size && (
                      <p className="text-muted-foreground">
                        Size: {(event.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-center text-muted-foreground text-xs py-4">
                  No events recorded
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="mt-2">
            <div className="space-y-2">
              <div className="text-xs">
                <p className="text-muted-foreground mb-1">Content Preview (last 500 chars):</p>
                <div className="p-2 bg-muted rounded font-mono text-xs max-h-[200px] overflow-y-auto break-all">
                  {streamingContent.slice(-500) || 'No content yet'}
                </div>
              </div>
              <div className="text-xs">
                <p className="text-muted-foreground">Total Length: {streamingContent.length} chars</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}