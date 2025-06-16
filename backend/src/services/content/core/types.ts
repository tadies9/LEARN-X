import { GenerationParams } from '../../../types/ai';
import { UserPersona } from '../../../types/persona';

export interface DeepExplanationParams extends GenerationParams {
  chunks: Array<{ id: string; content: string; metadata?: any }>;
  topic: string;
  subtopic?: string;
  persona: UserPersona;
}

export interface DeepSummaryParams extends GenerationParams {
  content: string;
  format: 'key-points' | 'comprehensive' | 'visual-map';
  persona: UserPersona;
}

export interface PersonalizedContent {
  content: string;
  personalizationScore: number;
  qualityMetrics: {
    naturalIntegration: number;
    educationalIntegrity: number;
    relevanceEngagement: number;
    flowReadability: number;
  };
  cached: boolean;
}

export interface ChatParams {
  message: string;
  context: string[];
  currentPage?: number;
  selectedText?: string;
  persona: UserPersona;
  model?: string;
}

export interface FlashcardParams {
  content: string;
  persona: UserPersona;
  contextualExamples?: boolean;
  model?: string;
}

export interface QuizParams {
  content: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  persona: UserPersona;
  adaptiveDifficulty?: boolean;
  model?: string;
}

export interface FlashcardResult {
  flashcards: Array<{
    front: string;
    back: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

export interface QuizResult {
  questions: Array<{
    question: string;
    type: string;
    options?: string[];
    answer: string;
    explanation: string;
  }>;
} 