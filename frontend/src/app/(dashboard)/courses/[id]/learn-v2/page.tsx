'use client';

import '@/styles/ai-content.css';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { SavedContentApiService } from '@/lib/api/saved';
import { StreamingDebug } from '@/components/debug/StreamingDebug';
import { useRouter } from 'next/navigation';

// Import modular components and hooks
import { useLearnV2Content } from './hooks/useLearnV2Content';
import { LearnV2Header } from './components/LearnV2Header';
import { StreamingContentDisplay } from './components/StreamingContentDisplay';
import { EnhancedFeedbackSection } from './components/EnhancedFeedbackSection';
import { ActiveMode, SessionData, UserProfile } from './types/streaming';
import { getSession, loadUserProfile } from './utils/sessionUtils';
import { getFileVersion } from './utils/fileUtils';

export default function LearnPage({ params: _params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName');

  // Auth & Profile
  const { user: _user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fileVersion, setFileVersion] = useState<string>('');

  // UI State
  const [activeMode, setActiveMode] = useState<ActiveMode>('explain');
  const [quickNote, setQuickNote] = useState('');
  const [reaction, setReaction] = useState<'positive' | 'neutral' | 'negative' | null>(null);

  // Get session and profile
  useEffect(() => {
    const initSession = async () => {
      const sessionData = await getSession();
      setSession(sessionData);

      if (sessionData?.user?.id) {
        const profileData = await loadUserProfile(sessionData);
        setProfile(profileData);
      }
    };
    initSession();
  }, []);

  // Get file version for cache invalidation
  useEffect(() => {
    const initFileVersion = async () => {
      if (!fileId || !session?.access_token) return;
      const version = await getFileVersion(fileId, session);
      setFileVersion(version);
    };
    initFileVersion();
  }, [fileId, session]);

  // Use the content hook
  const { content, isStreaming, error, regenerate } = useLearnV2Content({
    fileId,
    activeMode,
    session,
    fileVersion,
    profile,
  });

  // Handle save content
  const handleSaveContent = async () => {
    if (!content || !session?.user?.id || !fileId) return;

    try {
      await SavedContentApiService.save({
        fileId,
        topicId: 'default',
        subtopic: 'intro',
        content,
        mode: activeMode,
        tags: [],
        notes: quickNote || undefined,
      });

      alert('Content saved successfully! You can access it from your saved content library.');
    } catch (err) {
      alert('Failed to save content. Please try again.');
    }
  };

  // Render error state
  if (error && !content) {
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
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Content Column (100%) */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <LearnV2Header
          fileName={fileName}
          activeMode={activeMode}
          onModeChange={setActiveMode}
          onRegenerate={regenerate}
          onSave={handleSaveContent}
          isStreaming={isStreaming}
          hasContent={!!content}
        />

        {/* Streaming Content */}
        <div className="flex-1 overflow-auto p-6 bg-background/60">
          <StreamingContentDisplay content={content} isStreaming={isStreaming} error={error} />

          {content && (
            <EnhancedFeedbackSection
              quickNote={quickNote}
              onQuickNoteChange={setQuickNote}
              onReaction={setReaction}
              currentReaction={reaction}
            />
          )}
        </div>
      </div>

      {/* Debug Component */}
      <StreamingDebug
        isStreaming={isStreaming}
        streamingContent={content}
        error={error}
        activeMode={activeMode}
        fileId={fileId}
      />
    </div>
  );
}
