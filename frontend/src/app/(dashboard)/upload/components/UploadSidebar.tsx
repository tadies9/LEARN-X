import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Brain, Sparkles, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface UploadSidebarProps {
  totalFiles?: number;
  processingFiles?: number;
  completedFiles?: number;
  errorFiles?: number;
}

export function UploadSidebar({
  totalFiles = 0,
  processingFiles = 0,
  completedFiles = 0,
  errorFiles = 0,
}: UploadSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Upload Stats */}
      {totalFiles > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Status</CardTitle>
            <CardDescription>Current session statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Files</span>
              </div>
              <span className="font-medium">{totalFiles}</span>
            </div>

            {processingFiles > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Processing</span>
                </div>
                <span className="font-medium text-blue-600">{processingFiles}</span>
              </div>
            )}

            {completedFiles > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-medium text-green-600">{completedFiles}</span>
              </div>
            )}

            {errorFiles > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="font-medium text-destructive">{errorFiles}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
          <CardDescription>Our AI-powered workflow transforms your content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">1. Upload</p>
              <p className="text-xs text-muted-foreground">
                Drop any PDF, document, or research paper
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">2. Process</p>
              <p className="text-xs text-muted-foreground">
                AI extracts and chunks content intelligently
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">3. Personalize</p>
              <p className="text-xs text-muted-foreground">
                Content is tailored to your learning style
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supported Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>• PDF documents</div>
            <div>• Word files (.doc, .docx)</div>
            <div>• PowerPoint (.ppt, .pptx)</div>
            <div>• Text files (.txt, .md)</div>
            <div>• Images (extracted text)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
