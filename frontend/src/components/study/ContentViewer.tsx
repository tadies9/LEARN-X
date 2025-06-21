'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { DynamicPdfViewer } from '@/components/optimized/DynamicPdfViewer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Slider } from '@/components/ui/Slider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentViewerProps {
  fileId: string;
  fileUrl: string;
  fileType: string;
  onTextSelect?: (text: string) => void;
  onPageChange?: (page: number) => void;
  initialPage?: number;
}

export function ContentViewer({
  fileId,
  fileUrl,
  fileType,
  onTextSelect,
  onPageChange,
  initialPage = 1,
}: ContentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Handle document load error
  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading document:', error);
    setError('Failed to load document');
    setLoading(false);
  };

  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page);
      onPageChange?.(page);
    }
  };

  // Handle zoom
  const handleZoom = (delta: number) => {
    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    setScale(newScale);
  };

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        onTextSelect?.(text);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [onTextSelect]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoom(0.1);
            break;
          case '-':
            e.preventDefault();
            handleZoom(-0.1);
            break;
          case 'f':
            e.preventDefault();
            setShowSearch(!showSearch);
            break;
        }
      } else {
        switch (e.key) {
          case 'ArrowLeft':
            goToPage(pageNumber - 1);
            break;
          case 'ArrowRight':
            goToPage(pageNumber + 1);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pageNumber, numPages, scale, showSearch]);

  // Render content based on file type
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      );
    }

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingSpinner />}
            className="flex justify-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        );

      case 'txt':
      case 'md':
        // For text files, we'll fetch and display the content
        return (
          <div className="prose prose-sm max-w-none p-8">
            <pre className="whitespace-pre-wrap">{/* Content would be fetched here */}</pre>
          </div>
        );

      default:
        return (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                This file type is not yet supported for viewing
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Page navigation */}
          {fileType === 'pdf' && numPages && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goToPage(pageNumber - 1)}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={pageNumber}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="h-8 w-16 text-center"
                  min={1}
                  max={numPages}
                />
                <span className="text-sm text-muted-foreground">of {numPages}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goToPage(pageNumber + 1)}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(-0.1)}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Slider
              value={[scale * 100]}
              onValueChange={([value]) => setScale(value / 100)}
              min={50}
              max={300}
              step={10}
              className="w-24"
            />
            <span className="w-12 text-sm">{Math.round(scale * 100)}%</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleZoom(0.1)} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Search */}
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4" />
          </Button>

          {/* Download */}
          <Button variant="ghost" size="icon" onClick={() => window.open(fileUrl, '_blank')}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="border-b px-4 py-2">
          <Input
            type="text"
            placeholder="Search in document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Content area */}
      <div ref={containerRef} className="flex-1 overflow-auto" style={{ userSelect: 'text' }}>
        {renderContent()}
      </div>
    </div>
  );
}
