import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AIApiService } from '@/lib/api/ai';
import { SavedContentApiService } from '@/lib/api/saved';
import {
  Topic,
  Subtopic,
  StudyMode,
  ReactionType,
  UserProfile,
  SupabaseSession,
  OutlineSection,
} from '../types/study';

interface UseStudySessionOptions {
  fileId: string | null;
  fileName: string | null;
  courseId: string;
}

export function useStudySession({
  fileId,
  fileName: _fileName,
  courseId: _courseId,
}: UseStudySessionOptions) {
  // Auth & Profile
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fileVersion, setFileVersion] = useState<string>('');

  // Feature flag
  const OUTLINE_ENABLED = false;

  // UI State
  const [selectedTopic, setSelectedTopic] = useState<string | null>(
    OUTLINE_ENABLED ? null : 'default'
  );
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(
    OUTLINE_ENABLED ? null : 'intro'
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [activeMode, setActiveMode] = useState<StudyMode>('explain');

  // Content State
  const [outline, setOutline] = useState<Topic[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [reaction, setReaction] = useState<ReactionType | null>(null);

  // Loading & Error State
  const [isLoadingOutline, setIsLoadingOutline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);

  // Get session and profile
  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      // Load user profile for persona via backend API
      if (session?.user?.id) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/persona`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const profileData = await response.json();
            setProfile(profileData);
          }
        } catch (error) {
          console.warn('Failed to load user profile:', error);
        }
      }
    };
    getSession();
  }, []);

  // Get file version for cache invalidation
  useEffect(() => {
    const getFileVersion = async () => {
      if (!fileId || !session?.access_token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const fileData = await response.json();
          setFileVersion(fileData.updatedAt || fileData.updated_at);
        }
      } catch (error) {
        console.warn('Failed to get file version:', error);
      }
    };
    getFileVersion();
  }, [fileId, session]);

  // Generate outline
  const generateOutline = useCallback(async () => {
    if (!OUTLINE_ENABLED) return;

    try {
      setIsLoadingOutline(true);
      setError(null);

      if (!fileId || !session?.access_token) {
        setError('Missing file information or authentication.');
        setIsLoadingOutline(false);
        return;
      }

      // Fetch outline from backend
      const outlineResponse = await AIApiService.generateOutline(fileId, session.access_token);

      const sections = outlineResponse.sections || [];

      if (!sections.length) {
        throw new Error('No outline sections returned');
      }

      // Map to Topic[] expected by UI
      const mappedTopics: Topic[] = sections.map((section: OutlineSection) => {
        const baseId = section.id || `section-${Math.random().toString(36).slice(2, 8)}`;

        const subtopics: Subtopic[] = [
          { id: `${baseId}-intro`, title: 'Introduction', type: 'intro', completed: false },
          { id: `${baseId}-concepts`, title: 'Key Concepts', type: 'concepts', completed: false },
          { id: `${baseId}-examples`, title: 'Examples', type: 'examples', completed: false },
          { id: `${baseId}-practice`, title: 'Practice', type: 'practice', completed: false },
          { id: `${baseId}-summary`, title: 'Summary', type: 'summary', completed: false },
        ];

        return {
          id: baseId,
          title: section.title || 'Untitled Section',
          summary: section.summary || '',
          chunkIds: section.chunkIds || [],
          chunkCount: section.chunkCount || 0,
          startPage: section.startPage || 1,
          endPage: section.endPage || 1,
          topics: section.topics || [],
          subtopics,
          progress: 0,
        } as Topic;
      });

      setOutline(mappedTopics);

      // Auto-select first topic and intro subtopic
      if (mappedTopics.length > 0) {
        setSelectedTopic(mappedTopics[0].id);
        setExpandedTopics(new Set([mappedTopics[0].id]));
        setSelectedSubtopic(mappedTopics[0].subtopics[0].id);
      }

      setIsLoadingOutline(false);
    } catch (err) {
      console.error('[useStudySession] Error generating outline:', err);
      setError('Failed to load outline');
      setIsLoadingOutline(false);
    }
  }, [fileId, session, OUTLINE_ENABLED]);

  // Initialize outline on mount
  useEffect(() => {
    if (!OUTLINE_ENABLED) {
      setIsLoadingOutline(false);
      return;
    }

    if (!fileId) {
      setError('File ID is required. Please select a file to personalize.');
      setIsLoadingOutline(false);
      return;
    }

    if (!session?.access_token) {
      return;
    }

    generateOutline();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [fileId, session, generateOutline, OUTLINE_ENABLED]);

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
  const handleReaction = async (reactionType: ReactionType) => {
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
      console.error('[useStudySession] Error sending feedback:', err);
    }
  };

  // Handle save content
  const handleSaveContent = async (streamingContent: string) => {
    if (!streamingContent || !selectedTopic || !selectedSubtopic || !session?.user?.id || !fileId)
      return;

    try {
      const topic = outline.find((t) => t.id === selectedTopic);

      await SavedContentApiService.save({
        fileId,
        topicId: selectedTopic,
        subtopic: selectedSubtopic,
        content: streamingContent,
        mode: activeMode,
        tags: topic?.topics || [],
        notes: quickNote || undefined,
      });

      alert('Content saved successfully! You can access it from your saved content library.');
    } catch (err) {
      console.error('[useStudySession] Error saving content:', err);
      alert('Failed to save content. Please try again.');
    }
  };

  // Calculate overall progress
  const overallProgress =
    outline.reduce((acc, topic) => acc + topic.progress, 0) / (outline.length || 1);

  return {
    // Auth & Profile
    session,
    profile,
    fileVersion,

    // Feature flags
    OUTLINE_ENABLED,

    // UI State
    selectedTopic,
    selectedSubtopic,
    expandedTopics,
    activeMode,
    setActiveMode,

    // Content State
    outline,
    quickNote,
    setQuickNote,
    reaction,

    // Loading & Error State
    isLoadingOutline,
    error,

    // Actions
    toggleTopic,
    selectSubtopic,
    handleReaction,
    handleSaveContent,

    // Computed
    overallProgress,
  };
}
