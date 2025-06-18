// SSE Event Types
export interface SSEEvent {
  type: string;
  data: unknown;
}

export interface ContentEvent extends SSEEvent {
  type: 'content';
  data: string;
}

export interface CompleteEvent extends SSEEvent {
  type: 'complete' | 'done';
  data: null;
}

export interface ErrorEvent extends SSEEvent {
  type: 'error';
  data: {
    message?: string;
  } | null;
}

export type StreamEvent = ContentEvent | CompleteEvent | ErrorEvent;

export type ActiveMode = 'explain' | 'summary' | 'flashcards' | 'quiz' | 'chat';

export interface StreamingState {
  content: string;
  isStreaming: boolean;
  error: string | null;
}

export interface UserProfile {
  persona?: Record<string, unknown>;
}

export interface SessionData {
  access_token: string;
  user: {
    id: string;
  };
}
