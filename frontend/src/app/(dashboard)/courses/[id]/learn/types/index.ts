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
