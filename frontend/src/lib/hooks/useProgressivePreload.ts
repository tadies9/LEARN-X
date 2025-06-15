/**
 * Hook for progressive content preloading
 * Implements the preloading strategy for learning content
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { contentCache, CacheOptions } from '../cache/ContentCache';
import { AIApiService } from '../api/ai';
import { useAuth } from '@/hooks/useAuth';

interface PreloadOptions {
  fileId: string;
  currentTopic: string;
  currentSubtopic?: string;
  topics: Array<{
    id: string;
    subtopics: Array<{
      id: string;
      title: string;
      type: string;
    }>;
  }>;
  fileVersion: string;
  persona?: {
    interests?: string[];
    learningStyle?: string;
    professionalBackground?: string;
    field?: string;
    communicationStyle?: string;
  };
  mode?: string;
}

export function useProgressivePreload({
  fileId,
  currentTopic,
  currentSubtopic,
  topics,
  fileVersion,
  persona,
  mode = 'explain',
}: PreloadOptions) {
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  
  useEffect(() => {
    const getSession = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);
  const preloadTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const currentIndexRef = useRef<{ topicIndex: number; subtopicIndex: number }>({
    topicIndex: -1,
    subtopicIndex: -1,
  });

  /**
   * Fetch content from API
   */
  const fetchContent = useCallback(
    async (topicId: string, subtopic?: string) => {
      if (!session?.access_token) return '';

      const response = await AIApiService.streamExplanation({
        fileId,
        topicId,
        subtopic,
        mode,
        token: session.access_token,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      // Read the stream and collect content
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                // Handle new structured SSE format
                if (parsed.type === 'content' && parsed.data) {
                  content += parsed.data;
                } else if (parsed.content) {
                  // Fallback for old format
                  content += parsed.content;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      return content;
    },
    [fileId, mode, session?.access_token]
  );

  /**
   * Preload a specific content
   */
  const preloadContent = useCallback(
    async (topicId: string, subtopic?: string) => {
      // Use user from auth hook if session is not ready
      const userId = session?.user?.id || user?.id;
      if (!userId) return;

      const cacheOptions: CacheOptions = {
        userId,
        fileId,
        topicId,
        subtopic,
        mode,
        version: fileVersion,
        persona,
      };

      console.log('[Preload] Starting preload for:', { topicId, subtopic });
      await contentCache.preload(cacheOptions, () => fetchContent(topicId, subtopic));
    },
    [fileId, fileVersion, mode, persona, session?.user?.id, user?.id, fetchContent]
  );

  /**
   * Update current position and trigger preloading
   */
  const updatePosition = useCallback(() => {
    // Find current topic and subtopic indices
    const topicIndex = topics.findIndex((t) => t.id === currentTopic);
    if (topicIndex === -1) return;

    const topic = topics[topicIndex];
    const subtopicIndex = currentSubtopic
      ? topic.subtopics.findIndex((st) => st.id === currentSubtopic)
      : -1;

    // Check if position changed
    if (
      currentIndexRef.current.topicIndex === topicIndex &&
      currentIndexRef.current.subtopicIndex === subtopicIndex
    ) {
      return;
    }

    currentIndexRef.current = { topicIndex, subtopicIndex };

    // Clear existing timers
    Object.values(preloadTimersRef.current).forEach((timer) => clearTimeout(timer));
    preloadTimersRef.current = {};

    // Strategy 1: If viewing a topic overview (no subtopic), preload all its subtopics
    if (!currentSubtopic && topic.subtopics.length > 0) {
      console.log('[Preload] Strategy 1: Preloading all subtopics for topic', topic.id);
      topic.subtopics.forEach((subtopic, index) => {
        const delay = index * 500; // Stagger by 500ms
        preloadTimersRef.current[`${topic.id}-${subtopic.id}`] = setTimeout(() => {
          console.log('[Preload] Loading subtopic:', subtopic.id);
          preloadContent(topic.id, subtopic.id);
        }, delay);
      });
      return;
    }

    // Strategy 2: If viewing a subtopic, preload next subtopic after 2s
    if (currentSubtopic && subtopicIndex < topic.subtopics.length - 1) {
      const nextSubtopic = topic.subtopics[subtopicIndex + 1];
      console.log('[Preload] Strategy 2: Will preload next subtopic in 2s:', nextSubtopic.id);
      preloadTimersRef.current['next'] = setTimeout(() => {
        console.log('[Preload] Loading next subtopic:', nextSubtopic.id);
        preloadContent(topic.id, nextSubtopic.id);
      }, 2000);
    }

    // Strategy 3: Preload remaining subtopics in current topic after 5s
    if (currentSubtopic) {
      preloadTimersRef.current['remaining'] = setTimeout(() => {
        topic.subtopics.forEach((subtopic, index) => {
          if (index !== subtopicIndex && index !== subtopicIndex + 1) {
            const delay = (index - subtopicIndex) * 1000;
            setTimeout(() => {
              preloadContent(topic.id, subtopic.id);
            }, delay);
          }
        });
      }, 5000);
    }

    // Strategy 4: Preload next topic's overview after 10s
    if (topicIndex < topics.length - 1) {
      const nextTopic = topics[topicIndex + 1];
      preloadTimersRef.current['nextTopic'] = setTimeout(() => {
        preloadContent(nextTopic.id);
      }, 10000);
    }
  }, [currentTopic, currentSubtopic, topics, preloadContent]);

  // Update position when current topic/subtopic changes
  useEffect(() => {
    updatePosition();

    // Cleanup timers on unmount
    return () => {
      Object.values(preloadTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, [updatePosition]);

  // Return cache stats for debugging
  const getCacheStats = useCallback(async () => {
    return await contentCache.getStats();
  }, []);

  return {
    preloadContent,
    getCacheStats,
    isPreloading: (topicId: string, subtopic?: string) => {
      const userId = session?.user?.id || user?.id;
      if (!userId) return false;

      return contentCache.isPreloading({
        userId,
        fileId,
        topicId,
        subtopic,
        mode,
        version: fileVersion,
        persona,
      });
    },
  };
}
