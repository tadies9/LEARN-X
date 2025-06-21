'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProgressivePreload } from '@/lib/hooks/useProgressivePreload';

// Import components
import { ContentHeader } from './components/ContentHeader';
import { MainContentArea } from './components/MainContentArea';
import { SidebarPanel } from './components/SidebarPanel';
import { StudyTools } from './components/StudyTools';

// Import hooks
import { useStudySession } from './hooks/useStudySession';
import { useContentStreaming } from './hooks/useContentStreaming';

export default function LearnPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName');
  const courseId = params.id;

  // Use study session hook
  const {
    session,
    profile,
    fileVersion,
    OUTLINE_ENABLED,
    selectedTopic,
    selectedSubtopic,
    expandedTopics,
    activeMode,
    setActiveMode,
    outline,
    quickNote,
    setQuickNote,
    reaction,
    isLoadingOutline,
    error,
    toggleTopic,
    selectSubtopic,
    handleReaction,
    handleSaveContent,
    overallProgress,
  } = useStudySession({ fileId, fileName, courseId });

  // Use content streaming hook
  const {
    streamingContent,
    isStreaming,
    error: streamingError,
    streamContent,
    clearCache,
  } = useContentStreaming({
    fileId,
    selectedTopic,
    selectedSubtopic,
    activeMode,
    session,
    fileVersion,
    profile,
    outline,
  });

  // Progressive Preloading Hook
  const { getCacheStats } = useProgressivePreload({
    fileId: fileId || '',
    currentTopic: selectedTopic || '',
    currentSubtopic: selectedSubtopic || undefined,
    topics: outline,
    fileVersion,
    persona: profile?.persona,
    mode: activeMode,
  });

  // Stream content when selection changes
  useEffect(() => {
    if (selectedTopic && selectedSubtopic) {
      streamContent();
    }
  }, [selectedTopic, selectedSubtopic, streamContent]);

  // Handle regenerate
  const handleRegenerate = async () => {
    await clearCache();
    await streamContent();
  };

  // Display error (prioritize streaming error)
  const displayError = streamingError || error;

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
  if (displayError && !outline.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <HelpCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Unable to Load Content</h2>
          <p className="text-muted-foreground mb-4">{displayError}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <ContentHeader
        fileName={fileName || ''}
        overallProgress={overallProgress}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onBackClick={() => router.back()}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Outline Panel (disabled) */}
        {OUTLINE_ENABLED && (
          <SidebarPanel
            outline={outline}
            selectedTopic={selectedTopic}
            selectedSubtopic={selectedSubtopic}
            expandedTopics={expandedTopics}
            isLoadingOutline={isLoadingOutline}
            onToggleTopic={toggleTopic}
            onSelectSubtopic={selectSubtopic}
          />
        )}

        {/* Content Area */}
        <MainContentArea
          selectedTopic={selectedTopic}
          selectedSubtopic={selectedSubtopic}
          outline={outline}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          quickNote={quickNote}
          reaction={reaction}
          onQuickNoteChange={setQuickNote}
          onReaction={handleReaction}
          onSaveContent={() => handleSaveContent(streamingContent)}
          onRegenerate={handleRegenerate}
        />
      </div>

      {/* Bottom Actions Bar */}
      <StudyTools
        profile={profile}
        onSaveProgress={() => {
          // TODO: Implement save progress
          alert('Save progress feature coming soon!');
        }}
        onExportNotes={() => {
          // TODO: Implement export notes
          alert('Export notes feature coming soon!');
        }}
        onCacheInfo={async () => {
          const stats = await getCacheStats();
          alert(
            `Cache Stats:\nMemory: ${stats.memoryCacheSize} items\nIndexedDB: ${stats.indexedDBStats.count} items\nPreloading: ${stats.preloadQueueSize} items`
          );
        }}
      />
    </div>
  );
}
