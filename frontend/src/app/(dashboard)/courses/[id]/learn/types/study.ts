export interface Topic {
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

export interface Subtopic {
  id: string;
  title: string;
  type: 'intro' | 'concepts' | 'examples' | 'practice' | 'summary';
  completed: boolean;
}

export type StudyMode = 'explain' | 'summary' | 'flashcards' | 'quiz' | 'chat';

export type ReactionType = 'positive' | 'neutral' | 'negative';

export interface StudySession {
  userId: string;
  fileId: string;
  topicId: string;
  subtopicId: string;
  mode: StudyMode;
  startedAt: Date;
  lastActiveAt: Date;
  progress: number;
}

export interface StudyContent {
  content: string;
  isStreaming: boolean;
  error?: string;
}

export interface UserProfile {
  persona?: {
    interests?: string[];
    learningStyle?: string;
    expertise?: string;
  };
}
