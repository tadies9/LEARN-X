'use client';

import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { ContentViewer } from './ContentViewer';
import { PersonalizedPanel } from './PersonalizedPanel';
import { StudyChat } from './StudyChat';
import { StudyToolbar } from './StudyToolbar';
import { AnnotationLayer } from './AnnotationLayer';
import { FlashcardPractice } from './FlashcardPractice';
import { QuizPractice } from './QuizPractice';
import { StudyTimer } from './StudyTimer';
import { useStudySession } from '@/hooks/useStudySession';
import { useSyncedScrolling } from '@/hooks/useSyncedScrolling';
import { UserPersona } from '@/lib/types/persona';
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
  MessageSquare,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StudyLayoutProps {
  courseId: string;
  courseTitle: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  moduleTitle?: string;
  userId: string;
  userPersona?: UserPersona | null;
}

export function StudyLayout({
  courseId,
  courseTitle,
  fileId,
  fileName,
  fileUrl,
  fileType,
  moduleTitle,
  userId,
  userPersona,
}: StudyLayoutProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPersonalized, setShowPersonalized] = useState(true);
  const [selectedText, setSelectedText] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [studyMode, setStudyMode] = useState<'explain' | 'summarize' | 'flashcards' | 'quiz'>(
    'explain'
  );
  const [activePanel, setActivePanel] = useState<'content' | 'practice' | 'timer'>('content');
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [practiceData, setPracticeData] = useState<{
    flashcards: Array<{
      id: string;
      front: string;
      back: string;
      difficulty: 'easy' | 'medium' | 'hard';
      tags: string[];
      reviewCount: number;
      lastReviewed?: Date;
      nextReview?: Date;
      confidence: number;
    }>;
    quizQuestions: Array<{
      id: string;
      type: 'multiple_choice' | 'true_false' | 'short_answer';
      question: string;
      options?: string[];
      answer: string;
      explanation: string;
      difficulty: 'easy' | 'medium' | 'hard';
      topic: string;
    }>;
  }>({ flashcards: [], quizQuestions: [] });

  // Initialize study session
  const { session, saveProgress } = useStudySession({
    fileId,
    userId,
  });

  // Initialize synchronized scrolling
  const { contentRef, personalizedRef, scrollToSection, scrollToPage } = useSyncedScrolling({
    onPageChange: handlePageChange,
    onSectionHighlight: (sectionId) => console.log('Section highlighted:', sectionId),
  });

  // Handle fullscreen toggle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // Handle text selection
  const handleTextSelection = (text: string) => {
    setSelectedText(text);
  };

  // Handle page change
  function handlePageChange(page: number) {
    setCurrentPage(page);
    saveProgress({
      lastPosition: { page, scroll: 0 },
      progress: {
        ...session?.progress,
        viewedPages: [...(session?.progress?.viewedPages || []), page],
        totalTime: session?.duration || 0,
        completedSections: session?.progress?.completedSections || [],
      },
    });
  }

  // Handle tool actions
  const handleToolAction = (
    action: 'highlight' | 'note' | 'timer' | 'stats' | 'export' | 'practice'
  ) => {
    switch (action) {
      case 'highlight':
        setShowAnnotations(!showAnnotations);
        break;
      case 'note':
        setShowAnnotations(true);
        break;
      case 'timer':
        setActivePanel('timer');
        break;
      case 'practice':
        setActivePanel('practice');
        generatePracticeContent();
        break;
      case 'stats':
        // TODO: Show statistics modal
        console.log('Show statistics');
        break;
      case 'export':
        // TODO: Show export modal
        console.log('Export content');
        break;
    }
  };

  // Generate practice content (flashcards and quiz)
  const generatePracticeContent = async () => {
    try {
      // Generate flashcards
      const flashcardResponse = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      // Generate quiz questions
      const quizResponse = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          type: 'multiple_choice',
        }),
      });

      if (flashcardResponse.ok && quizResponse.ok) {
        const flashcards = await flashcardResponse.json();
        const quiz = await quizResponse.json();

        setPracticeData({
          flashcards: flashcards.data || [],
          quizQuestions: quiz.data || [],
        });
      }
    } catch (error) {
      console.error('Failed to generate practice content:', error);
    }
  };

  return (
    <div
      className={cn('flex h-screen flex-col bg-background', isFullscreen && 'fixed inset-0 z-50')}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Course
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{fileName}</h1>
            <p className="text-sm text-muted-foreground">
              {courseTitle} {moduleTitle && `• ${moduleTitle}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPersonalized(!showPersonalized)}
            title={showPersonalized ? 'Hide AI panel' : 'Show AI panel'}
          >
            {showPersonalized ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            title={showChat ? 'Hide chat' : 'Show chat'}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Study Toolbar */}
      <StudyToolbar
        studyMode={studyMode}
        onModeChange={setStudyMode}
        selectedText={selectedText}
        fileId={fileId}
        onToolAction={handleToolAction}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Original Content Panel */}
          <Panel defaultSize={showPersonalized ? 50 : 100} minSize={30}>
            <div className="relative h-full" ref={contentRef}>
              <ContentViewer
                fileId={fileId}
                fileUrl={fileUrl}
                fileType={fileType}
                onTextSelect={handleTextSelection}
                onPageChange={handlePageChange}
                initialPage={session?.lastPosition?.page}
              />

              {/* Annotation Layer */}
              {showAnnotations && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="pointer-events-auto">
                    <AnnotationLayer fileId={fileId} containerRef={contentRef} />
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Resize Handle */}
          {showPersonalized && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />

              {/* Personalized Content Panel */}
              <Panel defaultSize={50} minSize={30}>
                <div ref={personalizedRef} className="h-full">
                  {activePanel === 'content' && (
                    <PersonalizedPanel
                      fileId={fileId}
                      selectedText={selectedText}
                      currentPage={currentPage}
                      studyMode={studyMode}
                      userPersona={userPersona}
                    />
                  )}

                  {activePanel === 'practice' && (
                    <div className="h-full overflow-auto">
                      {studyMode === 'flashcards' ? (
                        <FlashcardPractice
                          fileId={fileId}
                          flashcards={practiceData.flashcards}
                          onComplete={(results) => {
                            console.log('Flashcard session completed:', results);
                            setActivePanel('content');
                          }}
                        />
                      ) : (
                        <QuizPractice
                          fileId={fileId}
                          questions={practiceData.quizQuestions}
                          onComplete={(results) => {
                            console.log('Quiz completed:', results);
                            setActivePanel('content');
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activePanel === 'timer' && (
                    <div className="h-full flex items-center justify-center p-6">
                      <StudyTimer
                        onSessionComplete={(duration, type) => {
                          console.log(`${type} session completed:`, duration);
                          saveProgress({
                            progress: {
                              ...session?.progress,
                              totalTime: (session?.progress?.totalTime || 0) + duration,
                              completedSections: session?.progress?.completedSections || [],
                              viewedPages: session?.progress?.viewedPages || [],
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              </Panel>
            </>
          )}

          {/* Chat Panel */}
          {showChat && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
              <Panel defaultSize={25} minSize={20} maxSize={40}>
                <StudyChat
                  fileId={fileId}
                  currentPage={currentPage}
                  selectedText={selectedText}
                  userPersona={userPersona}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
