'use client';

import { useState, useEffect, useCallback } from 'react';
import { debounce } from '@/lib/utils';

interface StudySession {
  fileId: string;
  userId: string;
  startedAt: Date;
  duration: number;
  lastPosition?: {
    page: number;
    scroll: number;
  };
  progress: {
    completedSections: string[];
    viewedPages: number[];
    totalTime: number;
  };
}

interface UseStudySessionOptions {
  fileId: string;
  userId: string;
}

export function useStudySession({ fileId, userId }: UseStudySessionOptions) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${fileId}/latest`);
        if (response.ok) {
          const data = await response.json();
          setSession(data);
        } else {
          // Create new session
          const newSession: StudySession = {
            fileId,
            userId,
            startedAt: new Date(),
            duration: 0,
            progress: {
              completedSections: [],
              viewedPages: [],
              totalTime: 0,
            },
          };
          setSession(newSession);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [fileId, userId]);

  // Save session periodically
  const saveSession = useCallback(
    debounce(async (sessionData: StudySession) => {
      try {
        await fetch('/api/sessions/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }, 5000),
    []
  );

  // Update progress
  const saveProgress = useCallback(
    (updates: Partial<StudySession>) => {
      if (!session) return;

      const updatedSession = {
        ...session,
        ...updates,
        duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
      };

      setSession(updatedSession);
      saveSession(updatedSession);
    },
    [session, saveSession]
  );

  // Track time spent
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      saveProgress({
        duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [session, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (session) {
        saveSession.flush();
      }
    };
  }, [session, saveSession]);

  return {
    session,
    isLoading,
    saveProgress,
  };
}
