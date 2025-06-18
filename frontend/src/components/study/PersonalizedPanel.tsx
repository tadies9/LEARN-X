'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useContentStream } from '@/hooks/useContentStream';
import { useOutline } from '@/hooks/useOutline';
import { UserPersona } from '@/lib/types/persona';
import {
  Brain,
  Sparkles,
  BookOpen,
  ListChecks,
  FileText,
  ChevronRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface PersonalizedPanelProps {
  fileId: string;
  selectedText?: string;
  currentPage?: number;
  studyMode: 'explain' | 'summarize' | 'flashcards' | 'quiz';
  userPersona?: UserPersona | null;
}

export function PersonalizedPanel({
  fileId,
  selectedText,
  currentPage = 1,
  studyMode,
  userPersona,
}: PersonalizedPanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);

  // Fetch outline
  const { outline, loading: outlineLoading } = useOutline(fileId);

  // Stream content
  const { content, isStreaming, error, streamContent, clearContent } = useContentStream();

  // Generate content when section is selected or text is highlighted
  useEffect(() => {
    if (selectedText) {
      generateContent('selection', selectedText);
    } else if (activeSection) {
      generateContent('section', activeSection);
    }
  }, [selectedText, activeSection, studyMode]);

  const generateContent = async (type: 'selection' | 'section', value: string) => {
    clearContent();
    setFeedback(null);

    await streamContent({
      type: studyMode,
      fileId,
      ...(type === 'selection' ? { selectedText: value } : { topicId: value }),
      userPersona,
    });
  };

  const handleFeedback = async (isHelpful: boolean) => {
    setFeedback(isHelpful ? 'helpful' : 'not-helpful');

    // Send feedback to backend
    try {
      await fetch('/api/v1/learn/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          contentType: studyMode,
          helpful: isHelpful,
          content: content.substring(0, 500), // First 500 chars
        }),
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const renderModeIcon = () => {
    switch (studyMode) {
      case 'explain':
        return <Brain className="h-4 w-4" />;
      case 'summarize':
        return <FileText className="h-4 w-4" />;
      case 'flashcards':
        return <ListChecks className="h-4 w-4" />;
      case 'quiz':
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!content && !isStreaming) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              {selectedText
                ? 'Content will appear here when you select text'
                : 'Select a section from the outline to begin'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Content header */}
        {(selectedText || activeSection) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {renderModeIcon()}
              <span className="text-sm font-medium capitalize">{studyMode}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                generateContent(
                  selectedText ? 'selection' : 'section',
                  selectedText || activeSection!
                )
              }
              disabled={isStreaming}
            >
              <RefreshCw className={cn('h-4 w-4', isStreaming && 'animate-spin')} />
            </Button>
          </div>
        )}

        {/* Streaming content */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && <LoadingSpinner className="ml-2 inline-block h-4 w-4" />}
        </div>

        {/* Feedback */}
        {content && !isStreaming && (
          <div className="flex items-center gap-4 border-t pt-4">
            <span className="text-sm text-muted-foreground">Was this helpful?</span>
            <div className="flex gap-2">
              <Button
                variant={feedback === 'helpful' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback(true)}
              >
                <ThumbsUp className="mr-1 h-3 w-3" />
                Yes
              </Button>
              <Button
                variant={feedback === 'not-helpful' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback(false)}
              >
                <ThumbsDown className="mr-1 h-3 w-3" />
                No
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Outline sidebar */}
      <div className="w-64 border-r">
        <div className="p-4">
          <h3 className="font-semibold">Content Outline</h3>
          <p className="text-sm text-muted-foreground">AI-generated structure</p>
        </div>

        <ScrollArea className="h-[calc(100%-5rem)]">
          {outlineLoading ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {outline?.sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left"
                  onClick={() => setActiveSection(section.id)}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  <div className="flex-1 truncate">
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {section.chunkCount} chunks • Page {section.startPage}-{section.endPage}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
    </div>
  );
}
