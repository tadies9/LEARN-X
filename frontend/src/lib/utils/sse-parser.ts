/**
 * SSE (Server-Sent Events) Parser Utility
 * Handles parsing of SSE streams with proper buffering and error handling
 */

export interface SSEMessage {
  event?: string;
  data?: any;
  id?: string;
  retry?: number;
}

export type SSECallback = (message: SSEMessage) => void;
export type SSEErrorCallback = (error: Error) => void;

export class SSEParser {
  private buffer = '';
  private decoder = new TextDecoder();

  /**
   * Process a chunk of data from an SSE stream
   * @param chunk - Raw data chunk from the stream
   * @param onMessage - Callback for each parsed message
   * @param onError - Optional error callback
   */
  processChunk(
    chunk: Uint8Array,
    onMessage: SSECallback,
    onError?: SSEErrorCallback
  ): void {
    // Decode the chunk and add to buffer
    const text = this.decoder.decode(chunk, { stream: true });
    this.buffer += text;

    // Split by double newline (SSE message separator)
    const messages = this.buffer.split('\n\n');
    
    // Keep the last incomplete message in the buffer
    this.buffer = messages.pop() || '';

    // Process each complete message
    for (const message of messages) {
      if (!message.trim()) continue;

      const sseMessage: SSEMessage = {};
      const lines = message.split('\n');

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          sseMessage.event = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            // Try to parse as JSON
            sseMessage.data = JSON.parse(dataStr);
          } catch {
            // If not JSON, keep as string
            sseMessage.data = dataStr;
          }
        } else if (line.startsWith('id: ')) {
          sseMessage.id = line.slice(4).trim();
        } else if (line.startsWith('retry: ')) {
          const retryStr = line.slice(7).trim();
          const retry = parseInt(retryStr, 10);
          if (!isNaN(retry)) {
            sseMessage.retry = retry;
          }
        }
      }

      // Only emit if we have data
      if (sseMessage.data !== undefined) {
        try {
          onMessage(sseMessage);
        } catch (error) {
          if (onError) {
            onError(error as Error);
          } else {
            console.error('Error processing SSE message:', error);
          }
        }
      }
    }
  }

  /**
   * Reset the parser state
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Get any remaining buffered data
   */
  getBuffer(): string {
    return this.buffer;
  }
}

/**
 * Helper function to parse SSE stream from a Response
 * @param response - Fetch Response object
 * @param onMessage - Callback for each message
 * @param onError - Optional error callback
 * @param onComplete - Optional completion callback
 */
export async function parseSSEStream(
  response: Response,
  onMessage: (data: any) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<void> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const parser = new SSEParser();

  try {
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      
      if (done) {
        if (onComplete) onComplete();
        break;
      }
      
      const value = result.value;

      parser.processChunk(
        value,
        (message) => {
          // Default to processing the data field
          if (message.data) {
            onMessage(message.data);
          }
        },
        onError
      );
    }
  } catch (error) {
    if (onError) {
      onError(error as Error);
    } else {
      throw error;
    }
  } finally {
    reader.releaseLock();
  }
}