/**
 * Hook for progressive content preloading
 * Implements the preloading strategy for learning content
 */

import { useEffect, useRef, useCallback } from 'react';
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
  persona?: any;
  mode?: string;
}

export function useProgressivePreload({
  fileId,
  currentTopic,
  currentSubtopic,
  topics,
  fileVersion,
  persona,
  mode = 'explain'
}: PreloadOptions) {
  const { session } = useAuth();
  const preloadTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const currentIndexRef = useRef<{ topicIndex: number; subtopicIndex: number }>({ 
    topicIndex: -1, 
    subtopicIndex: -1 
  });

  /**
   * Fetch content from API
   */
  const fetchContent = useCallback(async (topicId: string, subtopic?: string) => {
    if (!session?.access_token) return '';

    const response = await AIApiService.streamExplanation({
      fileId,
      topicId,
      subtopic,
      mode,
      token: session.access_token
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    // Read the stream and collect content
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = '';

    if (reader) {
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
              if (parsed.content) {
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
  }, [fileId, mode, session?.access_token]);

  /**
   * Preload a specific content
   */
  const preloadContent = useCallback(async (topicId: string, subtopic?: string) => {
    if (!session?.user?.id) return;

    const cacheOptions: CacheOptions = {
      userId: session.user.id,
      fileId,
      topicId,
      subtopic,
      mode,
      version: fileVersion,
      persona
    };

    await contentCache.preload(cacheOptions, () => fetchContent(topicId, subtopic));
  }, [fileId, fileVersion, mode, persona, session?.user?.id, fetchContent]);

  /**
   * Update current position and trigger preloading
   */
  const updatePosition = useCallback(() => {
    // Find current topic and subtopic indices
    const topicIndex = topics.findIndex(t => t.id === currentTopic);
    if (topicIndex === -1) return;

    const topic = topics[topicIndex];
    const subtopicIndex = currentSubtopic 
      ? topic.subtopics.findIndex(st => st.id === currentSubtopic)
      : -1;

    // Check if position changed
    if (currentIndexRef.current.topicIndex === topicIndex && 
        currentIndexRef.current.subtopicIndex === subtopicIndex) {
      return;
    }

    currentIndexRef.current = { topicIndex, subtopicIndex };

    // Clear existing timers
    Object.values(preloadTimersRef.current).forEach(timer => clearTimeout(timer));
    preloadTimersRef.current = {};

    // Strategy 1: If viewing a topic overview (no subtopic), preload all its subtopics
    if (!currentSubtopic && topic.subtopics.length > 0) {
      topic.subtopics.forEach((subtopic, index) => {
        const delay = index * 500; // Stagger by 500ms
        preloadTimersRef.current[`${topic.id}-${subtopic.id}`] = setTimeout(() => {
          preloadContent(topic.id, subtopic.id);
        }, delay);
      });
      return;
    }

    // Strategy 2: If viewing a subtopic, preload next subtopic after 2s
    if (currentSubtopic && subtopicIndex < topic.subtopics.length - 1) {
      const nextSubtopic = topic.subtopics[subtopicIndex + 1];
      preloadTimersRef.current['next'] = setTimeout(() => {
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
      Object.values(preloadTimersRef.current).forEach(timer => clearTimeout(timer));
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
      if (!session?.user?.id) return false;
      
      return contentCache.isPreloading({
        userId: session.user.id,
        fileId,
        topicId,
        subtopic,
        mode,
        version: fileVersion,
        persona
      });
    }
  };
}