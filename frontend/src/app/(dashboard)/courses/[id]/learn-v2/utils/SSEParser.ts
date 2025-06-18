import { StreamEvent } from '../types/streaming';

// SSE Parser to handle different event formats
export class SSEParser {
  private buffer = '';

  parseChunk(chunk: string): Array<StreamEvent> {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    const events: Array<StreamEvent> = [];

    // Keep the last line if it's incomplete
    this.buffer = lines[lines.length - 1];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          events.push({ type: 'done', data: null });
          continue;
        }

        if (data === '') continue;

        try {
          const parsed = JSON.parse(data);
          events.push(parsed);
        } catch {
          // Handle non-JSON data as raw content
          if (data && !data.startsWith('{')) {
            events.push({ type: 'content', data });
          }
        }
      }
    }

    return events;
  }

  reset() {
    this.buffer = '';
  }
}
