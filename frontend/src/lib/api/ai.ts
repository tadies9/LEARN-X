import { API_CLIENT } from './client';

export interface SearchOptions {
  query: string;
  fileId?: string;
  limit?: number;
  searchType?: 'vector' | 'keyword' | 'hybrid';
  weightVector?: number;
  weightKeyword?: number;
}

export interface SearchResult {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  score: number;
  highlights?: string[];
  metadata: {
    chunkIndex: number;
    contentType: string;
    importance: string;
    sectionTitle?: string;
    concepts?: string[];
    keywords?: string[];
  };
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  cached: boolean;
  query: {
    original: string;
    processed: string;
    keywords: string[];
  };
}

export interface OutlineSection {
  id: string;
  title: string;
  summary: string;
  chunkIds: string[];
  chunkCount: number;
  startPage: number;
  endPage: number;
  topics: string[];
}

export interface AIUsageStats {
  dailySpend: number;
  dailyLimit: number;
  remainingBudget: number;
  personalizationMetrics?: Record<string, unknown>;
}

export class AIApiService {
  /**
   * Search content using semantic/hybrid search
   */
  static async search(options: SearchOptions): Promise<SearchResponse> {
    const response = await API_CLIENT.get('/ai/search', {
      params: options,
    });
    return response.data.data;
  }

  /**
   * Generate outline for a file
   */
  static async generateOutline(
    fileId: string,
    token?: string
  ): Promise<{ sections: OutlineSection[] }> {
    const config = token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};

    const response = await API_CLIENT.get(`/learn/outline/${fileId}`, config);

    // Some endpoints wrap data under { data: { … } }, others return directly.
    const payload = response.data?.data ?? response.data;

    return {
      sections: payload.sections ?? [],
    };
  }

  /**
   * Stream explanation using fetch with proper SSE parsing (production-ready)
   */
  static async streamExplanation(params: {
    fileId?: string;
    topicId: string;
    subtopic?: string;
    mode?: string;
    token: string;
  }): Promise<Response> {
    // Use the same base URL as API_CLIENT
    const baseUrl = API_CLIENT.defaults.baseURL;
    const fullUrl = `${baseUrl}/learn/explain/stream`;

    // Streaming to endpoint

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.token}`,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      credentials: 'include', // Required for CORS with credentials
      body: JSON.stringify({
        fileId: params.fileId,
        topicId: params.topicId,
        subtopic: params.subtopic,
        mode: params.mode || 'explain',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  /**
   * Generate summary for a file
   */
  static async generateSummary(
    fileId: string,
    format: 'key-points' | 'comprehensive' | 'visual-map'
  ): Promise<{ summary: string; format: string }> {
              const response = await API_CLIENT.post('/learn/explain/stream', {
      fileId,
      mode: 'summary',
      format,
    });
    return response.data.data;
  }

  /**
   * Generate flashcards from content
   */
  static async generateFlashcards(
    fileId: string,
    chunkIds?: string[]
  ): Promise<{
    flashcards: Array<{
      front: string;
      back: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    count: number;
  }> {
    const response = await API_CLIENT.post('/ai/flashcards', {
      fileId,
      ...(chunkIds && { chunkIds }),
    });
    return response.data.data;
  }

  /**
   * Generate quiz questions
   */
  static async generateQuiz(
    fileId: string,
    type: 'multiple_choice' | 'true_false' | 'short_answer',
    chunkIds?: string[]
  ): Promise<{
    questions: Array<{
      question: string;
      type: string;
      options?: string[];
      answer: string;
      explanation: string;
    }>;
    count: number;
  }> {
    const response = await API_CLIENT.post('/ai/quiz', {
      fileId,
      type,
      ...(chunkIds && { chunkIds }),
    });
    return response.data.data;
  }

  /**
   * Get chat stream URL for interactive learning
   */
  static getChatStreamUrl(params: {
    fileId?: string;
    message: string;
    currentPage?: number;
    selectedText?: string;
    personaId?: string;
    token: string;
  }): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const searchParams = new URLSearchParams({
      message: params.message,
      token: params.token,
      ...(params.fileId && { fileId: params.fileId }),
      ...(params.currentPage && { currentPage: params.currentPage.toString() }),
      ...(params.selectedText && { selectedText: params.selectedText }),
      ...(params.personaId && { personaId: params.personaId }),
    });
    return `${baseUrl}/ai/chat/stream?${searchParams.toString()}`;
  }

  /**
   * Submit feedback for AI content
   */
  static async submitFeedback(data: {
    contentId: string;
    helpful: boolean;
    rating?: number;
    comments?: string;
  }): Promise<void> {
    await API_CLIENT.post('/ai/feedback', data);
  }

  /**
   * Get AI usage statistics
   */
  static async getUsageStats(): Promise<AIUsageStats> {
    const response = await API_CLIENT.get('/ai/usage');
    return response.data.data;
  }

  /**
   * Get cost information
   */
  static async getCosts(): Promise<Record<string, unknown>> {
    const response = await API_CLIENT.get('/ai/costs');
    return response.data.data;
  }

  /**
   * Clear search cache for user
   */
  static async clearSearchCache(): Promise<void> {
    await API_CLIENT.delete('/ai/search/cache');
  }
}

export default AIApiService;
