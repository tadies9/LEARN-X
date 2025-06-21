/**
 * SSE Types
 * Type definitions for Server-Sent Events messages
 */

export interface SSEContentMessage {
  type: 'content';
  data: string;
}

export interface SSEConnectedMessage {
  type: 'connected';
  data: string;
}

export interface SSECompleteMessage {
  type: 'complete';
  data?: string;
}

export interface SSEErrorMessage {
  type: 'error';
  data?: {
    message: string;
  };
}

export interface SSERegenerationStartMessage {
  type: 'regeneration-start';
  data: {
    message: string;
  };
}

export type SSEExplainMessage = 
  | SSEContentMessage 
  | SSEConnectedMessage 
  | SSECompleteMessage 
  | SSEErrorMessage
  | SSERegenerationStartMessage;