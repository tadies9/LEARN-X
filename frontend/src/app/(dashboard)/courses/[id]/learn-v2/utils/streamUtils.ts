import { AIApiService } from '@/lib/api/ai';
import { ActiveMode } from '../types/streaming';

export async function generateNonStreamingContent(
  activeMode: ActiveMode,
  fileId: string
): Promise<string> {
  switch (activeMode) {
    case 'summary': {
      const summaryResult = await AIApiService.generateSummary(fileId, 'key-points');
      return `
        <div class="ai-generated-content">
          <h2>Summary</h2>
          <p>${summaryResult.summary}</p>
        </div>
      `;
    }

    case 'flashcards': {
      const flashcardsResult = await AIApiService.generateFlashcards(fileId, []);
      return `
        <div class="ai-generated-content">
          <h2>Flashcards</h2>
          ${flashcardsResult.flashcards
            .map(
              (card, index) => `
            <div class="flashcard mb-4 p-4 border rounded-lg">
              <div class="flashcard-front mb-2">
                <h3>Question ${index + 1}</h3>
                <p>${card.front}</p>
              </div>
              <div class="flashcard-back mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <strong>Answer:</strong>
                <p>${card.back}</p>
              </div>
              <div class="flashcard-difficulty text-sm text-gray-600 mt-2">
                Difficulty: ${card.difficulty}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    case 'quiz': {
      const quizResult = await AIApiService.generateQuiz(fileId, 'multiple_choice', []);
      const quizHtml = quizResult.questions
        .map(
          (q, index) => `
        <div class="quiz-question mb-6 p-4 border rounded-lg">
          <div class="question mb-3">
            <strong>Question ${index + 1}:</strong> ${q.question}
          </div>
          ${
            q.options
              ? `
            <div class="options mb-3">
              ${q.options.map((opt, i) => `<div>${String.fromCharCode(65 + i)}) ${opt}</div>`).join('')}
            </div>
          `
              : ''
          }
          <div class="answer mb-2">
            <strong>Answer:</strong> ${q.answer}
          </div>
          <div class="explanation text-sm text-gray-600">
            <strong>Explanation:</strong> ${q.explanation}
          </div>
        </div>
      `
        )
        .join('');
      return `<div class="quiz"><h3>Quiz (${quizResult.count} questions)</h3>${quizHtml}</div>`;
    }

    default:
      return '<p>Select a mode to generate content.</p>';
  }
}
