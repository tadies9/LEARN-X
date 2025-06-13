'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PDFViewer } from '@/components/learning/PdfViewer';
import { AIChat } from '@/components/learning/AiChat';
import { ProgressTracker } from '@/components/learning/ProgressTracker';
import { QuizComponent } from '@/components/learning/QuizComponent';
import {
  FileText,
  MessageSquare,
  Target,
  Brain,
  ChevronLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Module } from '@/lib/types/course';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface LearningLayoutProps {
  courseId: string;
  courseTitle: string;
  pdfUrl: string;
  modules: Module[];
  questions?: Question[];
}

export function LearningLayout({
  courseId,
  courseTitle,
  pdfUrl,
  modules,
  questions = [],
}: LearningLayoutProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('document');

  const mockQuestions =
    questions.length > 0
      ? questions
      : [
          {
            id: '1',
            question: 'What is the primary purpose of React hooks?',
            options: [
              'To style components',
              'To manage state and side effects in functional components',
              'To create class components',
              'To handle routing',
            ],
            correctAnswer: 1,
            explanation:
              'React hooks allow you to use state and other React features in functional components without writing a class.',
          },
          {
            id: '2',
            question: 'Which hook would you use to perform side effects?',
            options: ['useState', 'useEffect', 'useContext', 'useReducer'],
            correctAnswer: 1,
            explanation:
              'useEffect is specifically designed to handle side effects like data fetching, subscriptions, or manually changing the DOM.',
          },
          {
            id: '3',
            question: 'What is the dependency array in useEffect used for?',
            options: [
              'To import dependencies',
              'To control when the effect runs',
              'To export functions',
              'To define state variables',
            ],
            correctAnswer: 1,
            explanation:
              'The dependency array tells React when to re-run the effect. If empty, it runs once on mount. If it contains values, it runs when those values change.',
          },
        ];

  return (
    <div className={cn('flex h-screen', isFullscreen && 'fixed inset-0 z-50 bg-background')}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-3 flex items-center justify-between bg-background">
          <div className="flex items-center gap-4">
            <Link href="/courses">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Courses
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">{courseTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document/Quiz Area */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b px-6">
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="document" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Document
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="gap-2">
                    <Brain className="h-4 w-4" />
                    Quiz
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="gap-2">
                    <Target className="h-4 w-4" />
                    Progress
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="document" className="flex-1 p-6 mt-0">
                <PDFViewer url={pdfUrl} title={courseTitle} />
              </TabsContent>

              <TabsContent value="quiz" className="flex-1 p-6 mt-0">
                <div className="max-w-3xl mx-auto">
                  <QuizComponent
                    title="Check Your Understanding"
                    questions={mockQuestions}
                    onComplete={(score) => {
                      console.log('Quiz completed with score:', score);
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="progress" className="flex-1 p-6 mt-0">
                <div className="max-w-3xl mx-auto">
                  <ProgressTracker
                    courseTitle={courseTitle}
                    totalProgress={65}
                    modules={modules}
                    currentModuleId={modules[1]?.id}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* AI Chat Sidebar */}
          {showSidebar && (
            <div className="w-96 border-l bg-background">
              <AIChat
                contextId={courseId}
                onSendMessage={async (message) => {
                  // Simulate AI response
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  return `I understand you're asking about "${message}". Based on the current document, let me explain this concept in a way that connects to your learning style...`;
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
