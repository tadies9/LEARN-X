'use client';

import { useState, useEffect } from 'react';
import { PDFViewer } from './PdfViewer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, AlertCircle } from 'lucide-react';

interface FileViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
  onPageChange?: (page: number) => void;
}

export function FileViewer({ url, fileName, mimeType, onPageChange }: FileViewerProps) {
  const [fileType, setFileType] = useState<string>('');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Determine file type from mime type or file extension
    let type = '';

    if (mimeType) {
      if (mimeType.includes('pdf')) {
        type = 'pdf';
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        type = 'docx';
      } else if (mimeType.includes('presentation')) {
        type = 'pptx';
      } else if (mimeType.includes('spreadsheet')) {
        type = 'xlsx';
      } else if (mimeType.includes('image')) {
        type = 'image';
      } else if (mimeType.includes('text')) {
        type = 'text';
      }
    }

    // Fallback to file extension if mime type not available
    if (!type && fileName) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension) {
        if (extension === 'pdf') type = 'pdf';
        else if (['doc', 'docx'].includes(extension)) type = 'docx';
        else if (['ppt', 'pptx'].includes(extension)) type = 'pptx';
        else if (['xls', 'xlsx'].includes(extension)) type = 'xlsx';
        else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) type = 'image';
        else if (['txt', 'md', 'csv'].includes(extension)) type = 'text';
      }
    }

    setFileType(type);
    setIsSupported(['pdf', 'image'].includes(type));
  }, [fileName, mimeType]);

  // Handle PDF files
  if (fileType === 'pdf') {
    return <PDFViewer url={url} title={fileName} onPageChange={onPageChange} />;
  }

  // Handle image files
  if (fileType === 'image') {
    return (
      <Card className="flex flex-col h-full bg-background">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">{fileName}</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => window.open(url, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
          <img src={url} alt={fileName} className="max-w-full max-h-full object-contain" />
        </div>
      </Card>
    );
  }

  // Handle unsupported file types
  const isDocumentType = ['docx', 'pptx', 'xlsx'].includes(fileType);

  return (
    <Card className="flex flex-col h-full bg-background">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">{fileName}</h3>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            {isDocumentType ? (
              <FileText className="h-10 w-10 text-muted-foreground" />
            ) : (
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-3">
            {isDocumentType ? 'Document Ready for AI Processing' : 'File Preview Not Available'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {isDocumentType
              ? `This ${fileType.toUpperCase()} document has been uploaded successfully. While direct preview isn't available, our AI can analyze and help you learn from this content.`
              : `This file type (${fileType || 'unknown'}) cannot be previewed directly in the browser. You can download it to view it with the appropriate application.`}
          </p>

          <div className="space-y-4">
            <Button onClick={() => window.open(url, '_blank')} className="gap-2">
              <Download className="h-4 w-4" />
              Download {fileName}
            </Button>

            {isDocumentType && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-left">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  🤖 AI Features Available:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Ask questions about the document content</li>
                  <li>• Get personalized explanations</li>
                  <li>• Generate summaries and key points</li>
                  <li>• Create study materials from this document</li>
                </ul>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                  Use the AI chat panel on the right to start learning!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
