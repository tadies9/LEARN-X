export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface QuizResults {
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  accuracy: number;
  questionResults: Array<{
    questionId: string;
    correct: boolean;
    userAnswer: string;
    timeSpent: number;
  }>;
  completedAt: Date;
}

export interface QuizPracticeProps {
  fileId: string;
  questions: QuizQuestion[];
  timeLimit?: number; // minutes
  onComplete?: (results: QuizResults) => void;
}
