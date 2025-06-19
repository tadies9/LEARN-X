import { QuizQuestion } from './types';

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'hard':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const checkAnswer = (question: QuizQuestion, userAnswer: string): boolean => {
  if (question.type === 'multiple_choice') {
    return userAnswer === question.answer;
  } else if (question.type === 'true_false') {
    return userAnswer.toLowerCase() === question.answer.toLowerCase();
  } else if (question.type === 'short_answer') {
    // Simple comparison - could be improved with fuzzy matching
    return userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
  }
  return false;
};
