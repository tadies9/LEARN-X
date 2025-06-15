'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, MessageSquare, Brain, HelpCircle, FileText, Lightbulb, ThumbsUp, ThumbsDown, Meh, Download, RefreshCw, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AIApiService, type OutlineSection } from '@/lib/api/ai';
import { createClient } from '@/lib/supabase/client';

interface Topic {
  id: string;
  title: string;
  summary: string;
  chunkIds: string[];
  chunkCount: number;
  startPage: number;
  endPage: number;
  topics: string[];
  subtopics: Subtopic[];
  progress: number;
}

interface Subtopic {
  id: string;
  title: string;
  type: 'intro' | 'concepts' | 'examples' | 'practice' | 'summary';
  completed: boolean;
}

interface StreamChunk {
  type: 'outline-start' | 'topic' | 'content-chunk' | 'complete' | 'error';
  data?: any;
}

export default function LearnPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName');
  const courseId = params.id;

  // Auth & Profile
  const { user } = useAuth();
  const { loadProfile } = useProfile();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // UI State
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [activeMode, setActiveMode] = useState<'explain' | 'summary' | 'flashcards' | 'quiz' | 'chat'>('explain');
  const [outlinePanelWidth, setOutlinePanelWidth] = useState(25); // percentage

  // Content State
  const [outline, setOutline] = useState<Topic[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [reaction, setReaction] = useState<'positive' | 'neutral' | 'negative' | null>(null);

  // Loading & Error State
  const [isLoadingOutline, setIsLoadingOutline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get session
  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);

  // Initialize outline generation when component mounts
  useEffect(() => {
    console.log('[LearnPage] useEffect triggered:', { 
      fileId, 
      fileName,
      hasSession: !!session, 
      hasToken: !!session?.access_token,
      searchParams: Object.fromEntries(searchParams.entries())
    });
    
    if (!fileId) {
      console.log('[LearnPage] Missing fileId parameter');
      setError('File ID is required. Please select a file to personalize.');
      setIsLoadingOutline(false);
      return;
    }

    if (!session?.access_token) {
      console.log('[LearnPage] Missing session token, waiting for authentication...');
      return; // Don't set loading to false, wait for session
    }

    generateOutline();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fileId, session]);

  // Generate outline using new API
  const generateOutline = async () => {
    try {
      setIsLoadingOutline(true);
      setError(null);

      console.log('[LearnPage] Starting outline generation for file:', fileId);

      // Use the new AI API to generate outline
      const response = await AIApiService.generateOutline(fileId!);
      
      console.log('[LearnPage] Outline response received:', response);

      if (!response || !response.sections || response.sections.length === 0) {
        console.warn('[LearnPage] No sections in outline response');
        setError('No content sections found. The file may not be processed yet.');
        setIsLoadingOutline(false);
        return;
      }
      
      // Transform outline sections into topics with subtopics
      const topics: Topic[] = response.sections.map((section, index) => ({
        id: section.id,
        title: section.title,
        summary: section.summary,
        chunkIds: section.chunkIds,
        chunkCount: section.chunkCount,
        startPage: section.startPage,
        endPage: section.endPage,
        topics: section.topics,
        subtopics: [
          { id: `${section.id}-intro`, title: 'Introduction', type: 'intro', completed: false },
          { id: `${section.id}-concepts`, title: 'Key Concepts', type: 'concepts', completed: false },
          { id: `${section.id}-examples`, title: 'Examples', type: 'examples', completed: false },
          { id: `${section.id}-practice`, title: 'Practice', type: 'practice', completed: false },
          { id: `${section.id}-summary`, title: 'Summary', type: 'summary', completed: false },
        ],
        progress: 0
      }));

      console.log('[LearnPage] Generated topics:', topics);
      setOutline(topics);

      // Auto-select first topic and intro subtopic
      if (topics.length > 0) {
        setSelectedTopic(topics[0].id);
        setExpandedTopics(new Set([topics[0].id]));
        setSelectedSubtopic(topics[0].subtopics[0].id);
        console.log('[LearnPage] Auto-selected first topic:', topics[0].id);
      }

      setIsLoadingOutline(false);
    } catch (err) {
      console.error('[LearnPage] Error generating outline:', err);
      console.error('[LearnPage] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        response: (err as any)?.response?.data
      });
      setError(`Failed to generate outline: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoadingOutline(false);
    }
  };

  // Stream content for selected topic/subtopic
  const streamContent = useCallback(async () => {
    if (!selectedTopic || !selectedSubtopic || !session?.access_token) return;

    try {
      setIsStreaming(true);
      setStreamingContent('');
      setError(null);

      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Handle different content modes
      if (activeMode === 'explain') {
        // Use explanation streaming with fetch
        try {
          const response = await AIApiService.streamExplanation({
            fileId: fileId || undefined,
            topicId: selectedTopic,
            subtopic: selectedSubtopic,
            token: session.access_token
          });

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          console.log('[LearnPage] Explanation stream opened');

          while (true) {
            if (abortController.signal.aborted) {
              reader.cancel();
              break;
            }

            const { done, value } = await reader.read();
            
            if (done) {
              setIsStreaming(false);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  setIsStreaming(false);
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setStreamingContent((prev) => prev + parsed.content);
                    // Auto-scroll to bottom
                    if (contentRef.current) {
                      contentRef.current.scrollTop = contentRef.current.scrollHeight;
                    }
                  }
                } catch (parseError) {
                  console.warn('[LearnPage] Failed to parse SSE data:', data);
                }
              }
            }
          }
        } catch (streamError) {
          if (!abortController.signal.aborted) {
            console.error('[LearnPage] Explanation streaming error:', streamError);
            setError('Failed to load explanation. Please try again.');
          }
          setIsStreaming(false);
        }

      } else {
        // Handle other modes (summary, flashcards, quiz) with direct API calls
        await handleNonStreamingContent();
      }
    } catch (err) {
      console.error('[LearnPage] Error streaming content:', err);
      setError('Failed to load content');
      setIsStreaming(false);
    }
  }, [selectedTopic, selectedSubtopic, fileId, activeMode, session]);

  // Handle non-streaming content modes
  const handleNonStreamingContent = async () => {
    try {
      const currentTopic = outline.find(t => t.id === selectedTopic);
      if (!currentTopic) return;

      switch (activeMode) {
        case 'summary': {
          const summaryResult = await AIApiService.generateSummary(fileId!, 'key-points');
          setStreamingContent(`<div class="summary"><h3>Summary</h3><p>${summaryResult.summary}</p></div>`);
          break;
        }

        case 'flashcards': {
          const flashcardsResult = await AIApiService.generateFlashcards(fileId!, currentTopic.chunkIds);
          const flashcardsHtml = flashcardsResult.flashcards.map((card, index) => `
            <div class="flashcard mb-4 p-4 border rounded-lg">
              <div class="flashcard-front mb-2">
                <strong>Card ${index + 1}:</strong> ${card.front}
              </div>
              <div class="flashcard-back">
                <strong>Answer:</strong> ${card.back}
              </div>
              <div class="flashcard-difficulty text-sm text-gray-600 mt-2">
                Difficulty: ${card.difficulty}
              </div>
            </div>
          `).join('');
          setStreamingContent(`<div class="flashcards"><h3>Flashcards (${flashcardsResult.count})</h3>${flashcardsHtml}</div>`);
          break;
        }

        case 'quiz': {
          const quizResult = await AIApiService.generateQuiz(fileId!, 'multiple_choice', currentTopic.chunkIds);
          const quizHtml = quizResult.questions.map((q, index) => `
            <div class="quiz-question mb-6 p-4 border rounded-lg">
              <div class="question mb-3">
                <strong>Question ${index + 1}:</strong> ${q.question}
              </div>
              ${q.options ? `
                <div class="options mb-3">
                  ${q.options.map((opt, i) => `<div>${String.fromCharCode(65 + i)}) ${opt}</div>`).join('')}
                </div>
              ` : ''}
              <div class="answer mb-2">
                <strong>Answer:</strong> ${q.answer}
              </div>
              <div class="explanation text-sm text-gray-600">
                <strong>Explanation:</strong> ${q.explanation}
              </div>
            </div>
          `).join('');
          setStreamingContent(`<div class="quiz"><h3>Quiz (${quizResult.count} questions)</h3>${quizHtml}</div>`);
          break;
        }

        default:
          setStreamingContent('<p>Select a mode to generate content.</p>');
      }
      
      setIsStreaming(false);
    } catch (error) {
      console.error('[LearnPage] Error generating content:', error);
      setError('Failed to generate content. Please try again.');
      setIsStreaming(false);
    }
  };

  // Stream content when selection changes
  useEffect(() => {
    if (selectedTopic && selectedSubtopic) {
      streamContent();
    }
  }, [selectedTopic, selectedSubtopic, streamContent]);

  // Toggle topic expansion
  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  // Handle subtopic selection
  const selectSubtopic = (topicId: string, subtopicId: string) => {
    setSelectedTopic(topicId);
    setSelectedSubtopic(subtopicId);
    setReaction(null); // Reset reaction for new content
    setQuickNote(''); // Reset note
  };

  // Handle reaction
  const handleReaction = async (reactionType: 'positive' | 'neutral' | 'negative') => {
    setReaction(reactionType);
    
    // Send feedback to backend using new API
    try {
      await AIApiService.submitFeedback({
        contentId: `${selectedTopic}-${selectedSubtopic}`,
        helpful: reactionType === 'positive',
        rating: reactionType === 'positive' ? 5 : reactionType === 'neutral' ? 3 : 1,
        comments: quickNote || undefined,
      });
    } catch (err) {
      console.error('[LearnPage] Error sending feedback:', err);
    }
  };

  // Calculate overall progress
  const overallProgress = outline.reduce((acc, topic) => acc + topic.progress, 0) / (outline.length || 1);

  // Render loading state
  if (isLoadingOutline && outline.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Analyzing Document</h2>
          <p className="text-muted-foreground">Creating your personalized learning path...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !outline.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <HelpCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Unable to Load Content</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{fileName || 'Learning Session'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Progress: {Math.round(overallProgress)}%</span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as any)}>
            <TabsList>
              <TabsTrigger value="explain" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Explain
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <FileText className="h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-2">
                <Brain className="h-4 w-4" />
                Flashcards
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Quiz
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Outline Panel */}
        <div 
          className="border-r bg-gray-50 overflow-y-auto"
          style={{ width: `${outlinePanelWidth}%` }}
        >
          <div className="p-4">
            <h2 className="font-semibold mb-4">Outline</h2>
            
            {/* Topics */}
            <div className="space-y-2">
              {outline.map((topic) => (
                <div key={topic.id} className="rounded-lg bg-white border">
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-sm">{topic.title}</span>
                    {expandedTopics.has(topic.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Subtopics */}
                  {expandedTopics.has(topic.id) && (
                    <div className="border-t">
                      {topic.subtopics.map((subtopic) => (
                        <button
                          key={subtopic.id}
                          onClick={() => selectSubtopic(topic.id, subtopic.id)}
                          className={cn(
                            "w-full px-6 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between",
                            selectedTopic === topic.id && selectedSubtopic === subtopic.id && "bg-primary/10 text-primary"
                          )}
                        >
                          <span className="capitalize">{subtopic.title}</span>
                          {subtopic.completed && (
                            <span className="text-green-600">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Loading more topics indicator */}
            {isLoadingOutline && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">Loading more topics...</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          {selectedTopic && selectedSubtopic && (
            <div className="border-b px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {outline.find(t => t.id === selectedTopic)?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {outline.find(t => t.id === selectedTopic)?.subtopics.find(st => st.id === selectedSubtopic)?.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    title="Regenerate"
                    onClick={streamContent}
                    disabled={isStreaming}
                  >
                    <RefreshCw className={cn("h-4 w-4", isStreaming && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content Body */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
            {!selectedTopic || !selectedSubtopic ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a topic from the outline to begin learning</p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {/* Streaming Content */}
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  {streamingContent ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: streamingContent }}
                      className="[&_div[style*='background-color']]:p-4 [&_div[style*='background-color']]:rounded-lg [&_div[style*='background-color']]:my-4 [&_details]:border [&_details]:p-4 [&_details]:rounded-lg [&_details]:my-2"
                    />
                  ) : isStreaming ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Loading personalized content...</span>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Content will appear here...</p>
                  )}
                </div>

                {/* Quick Note */}
                {streamingContent && (
                  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Quick Note
                    </h4>
                    <textarea
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Jot down your thoughts..."
                      className="w-full h-20 p-2 border rounded-md resize-none"
                    />
                  </div>
                )}

                {/* Reaction Buttons */}
                {streamingContent && !isStreaming && (
                  <div className="mt-6 flex items-center justify-center gap-4">
                    <span className="text-sm text-muted-foreground">Was this helpful?</span>
                    <div className="flex gap-2">
                      <Button
                        variant={reaction === 'positive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReaction('positive')}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={reaction === 'neutral' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReaction('neutral')}
                      >
                        <Meh className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={reaction === 'negative' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReaction('negative')}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="border-t px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Save Progress</Button>
          <Button variant="outline" size="sm">Export Notes</Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {profile?.persona?.interests && (
            <span>Personalized for your interests: {profile.persona.interests.slice(0, 3).join(', ')}</span>
          )}
        </div>
      </div>
    </div>
  );
}