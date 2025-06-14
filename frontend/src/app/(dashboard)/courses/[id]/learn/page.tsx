'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, MessageSquare, Brain, HelpCircle, FileText, Lightbulb, ThumbsUp, ThumbsDown, Meh, Download, RefreshCw, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';

interface Topic {
  id: string;
  title: string;
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
  const { session } = useAuth();
  const { profile } = useProfile();

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

  // Initialize outline generation when component mounts
  useEffect(() => {
    console.log('[LearnPage] useEffect triggered:', { fileId, hasSession: !!session, hasToken: !!session?.access_token });
    
    if (!fileId || !session?.access_token) {
      console.log('[LearnPage] Missing fileId or session token');
      setIsLoadingOutline(false);
      return;
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

  // Generate outline using SSE
  const generateOutline = async () => {
    try {
      setIsLoadingOutline(true);
      setError(null);

      console.log('[LearnPage] Starting outline generation for file:', fileId);
      console.log('[LearnPage] API URL:', process.env.NEXT_PUBLIC_API_URL);

      // Create SSE connection for outline generation with auth token
      const url = `${process.env.NEXT_PUBLIC_API_URL}/ai/learn/generate-outline?fileId=${fileId}&token=${session.access_token}`;
      console.log('[LearnPage] SSE URL:', url);
      
      const eventSource = new EventSource(url);

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        console.log('[LearnPage] SSE message received:', event.data);
        const data: StreamChunk = JSON.parse(event.data);

        switch (data.type) {
          case 'outline-start':
            console.log('[LearnPage] Outline generation started');
            break;

          case 'topic':
            // Add topic to outline as it's generated
            setOutline((prev) => [...prev, data.data as Topic]);
            
            // Auto-select first topic
            if (!selectedTopic) {
              setSelectedTopic(data.data.id);
              setExpandedTopics(new Set([data.data.id]));
              // Auto-select intro subtopic
              const introSubtopic = data.data.subtopics.find((st: Subtopic) => st.type === 'intro');
              if (introSubtopic) {
                setSelectedSubtopic(introSubtopic.id);
              }
            }
            break;

          case 'complete':
            console.log('[LearnPage] Outline generation complete');
            setIsLoadingOutline(false);
            eventSource.close();
            break;

          case 'error':
            console.error('[LearnPage] Outline generation error:', data.data);
            setError(data.data.message || 'Failed to generate outline');
            setIsLoadingOutline(false);
            eventSource.close();
            break;
        }
      };

      eventSource.onerror = (error) => {
        console.error('[LearnPage] SSE error:', error);
        console.error('[LearnPage] SSE readyState:', eventSource.readyState);
        setError('Connection lost. Please refresh the page.');
        setIsLoadingOutline(false);
        eventSource.close();
      };
      
      eventSource.onopen = () => {
        console.log('[LearnPage] SSE connection opened');
      };
    } catch (err) {
      console.error('[LearnPage] Error setting up outline generation:', err);
      setError('Failed to start outline generation');
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

      // Create SSE connection for content streaming with auth token
      const url = `${process.env.NEXT_PUBLIC_API_URL}/ai/learn/explain/stream?` +
        `fileId=${fileId}&topicId=${selectedTopic}&subtopic=${selectedSubtopic}&mode=${activeMode}&token=${session.access_token}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        if (abortController.signal.aborted) {
          eventSource.close();
          return;
        }

        const data: StreamChunk = JSON.parse(event.data);

        switch (data.type) {
          case 'content-chunk':
            setStreamingContent((prev) => prev + data.data);
            // Auto-scroll to bottom
            if (contentRef.current) {
              contentRef.current.scrollTop = contentRef.current.scrollHeight;
            }
            break;

          case 'complete':
            setIsStreaming(false);
            eventSource.close();
            break;

          case 'error':
            setError(data.data.message || 'Failed to stream content');
            setIsStreaming(false);
            eventSource.close();
            break;
        }
      };

      eventSource.onerror = (error) => {
        if (!abortController.signal.aborted) {
          console.error('[LearnPage] Content streaming error:', error);
          setError('Failed to load content. Please try again.');
        }
        setIsStreaming(false);
        eventSource.close();
      };

      // Store event source for cleanup
      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('[LearnPage] Error streaming content:', err);
      setError('Failed to load content');
      setIsStreaming(false);
    }
  }, [selectedTopic, selectedSubtopic, fileId, activeMode, session]);

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
    
    // Send feedback to backend
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/learn/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          contentId: `${selectedTopic}-${selectedSubtopic}`,
          reaction: reactionType,
          note: quickNote || undefined,
        }),
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