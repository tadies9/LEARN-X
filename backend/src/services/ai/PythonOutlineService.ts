/**
 * Python-based Outline Generation Service
 * Replaces direct OpenAI calls for outline generation with Python AI service
 */

import { logger } from '../../utils/logger';
import { pythonAIClient, PythonAIClient, ContentGenerationRequest } from './PythonAIClient';
import { UserPersona } from '../../types/persona';

// Type guard for usage object
function hasTokenUsage(usage: unknown): usage is { total_tokens: number } {
  return (
    typeof usage === 'object' &&
    usage !== null &&
    'total_tokens' in usage &&
    typeof (usage as any).total_tokens === 'number'
  );
}

export interface OutlineSection {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  chunkIds: string[];
  chunkCount: number;
  startPage?: number;
  endPage?: number;
}

export interface OutlineGenerationParams {
  content: string;
  filename?: string;
  persona?: UserPersona;
  sectionCount?: number;
  includePageNumbers?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  userId?: string;
}

export interface OutlineResult {
  fileId?: string;
  sections: OutlineSection[];
  generatedAt: Date;
  tokensUsed?: number;
  processingTime?: number;
}

export class PythonOutlineService {
  private client: PythonAIClient;

  constructor(client: PythonAIClient = pythonAIClient) {
    this.client = client;
  }

  /**
   * Generate a structured learning outline using Python AI service
   */
  async generateOutline(params: OutlineGenerationParams): Promise<OutlineResult> {
    const startTime = Date.now();

    logger.info('Generating outline via Python AI service', {
      contentLength: params.content.length,
      sectionCount: params.sectionCount || 4,
      userId: params.userId,
    });

    try {
      // Build system prompt for outline generation
      const userPrompt = this.buildUserPrompt(params);

      const request: ContentGenerationRequest = {
        content: userPrompt,
        content_type: 'outline',
        topic: params.filename ? `Document: ${params.filename}` : 'Document Analysis',
        difficulty: params.difficulty || 'intermediate',
        persona: params.persona,
        model: 'gpt-4o', // Use GPT-4 for better structured output
        temperature: 0.3, // Lower temperature for more consistent structure
        max_tokens: 2000,
        stream: false, // Outlines are better as complete responses
        user_id: params.userId,
      };

      let outlineContent = '';
      let tokensUsed = 0;

      for await (const chunk of this.client.generateContent(request)) {
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.content) {
          outlineContent += chunk.content;
        }

        // Extract token usage if available
        if (chunk.metadata?.usage && hasTokenUsage(chunk.metadata.usage)) {
          tokensUsed = chunk.metadata.usage.total_tokens || 0;
        }
      }

      // Parse the outline response
      const sections = this.parseOutlineResponse(outlineContent, params);

      const processingTime = Date.now() - startTime;

      logger.info('Outline generation completed', {
        sectionsGenerated: sections.length,
        tokensUsed,
        processingTime,
        userId: params.userId,
      });

      return {
        sections,
        generatedAt: new Date(),
        tokensUsed,
        processingTime,
      };
    } catch (error) {
      logger.error('Python outline generation failed:', error);
      throw new Error(
        `Outline generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate outline with streaming for real-time updates
   */
  async *generateOutlineStream(params: OutlineGenerationParams): AsyncGenerator<
    {
      type: 'section' | 'complete' | 'error';
      data?: OutlineSection | OutlineResult;
      error?: string;
    },
    void,
    unknown
  > {
    const startTime = Date.now();

    try {
      const userPrompt = this.buildUserPrompt(params);

      const request: ContentGenerationRequest = {
        content: userPrompt,
        content_type: 'outline',
        topic: params.filename ? `Document: ${params.filename}` : 'Document Analysis',
        difficulty: params.difficulty || 'intermediate',
        persona: params.persona,
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 2000,
        stream: true,
        user_id: params.userId,
      };

      let accumulatedContent = '';
      let tokensUsed = 0;

      for await (const chunk of this.client.generateContent(request)) {
        if (chunk.error) {
          yield { type: 'error', error: chunk.error };
          return;
        }

        if (chunk.content) {
          accumulatedContent += chunk.content;

          // Try to parse partial outline and yield complete sections
          const partialSections = this.tryParsePartialOutline(accumulatedContent);
          for (const section of partialSections) {
            yield { type: 'section', data: section };
          }
        }

        if (chunk.metadata?.usage && hasTokenUsage(chunk.metadata.usage)) {
          tokensUsed = chunk.metadata.usage.total_tokens || 0;
        }
      }

      // Final parsing and completion
      const finalSections = this.parseOutlineResponse(accumulatedContent, params);
      const processingTime = Date.now() - startTime;

      yield {
        type: 'complete',
        data: {
          sections: finalSections,
          generatedAt: new Date(),
          tokensUsed,
          processingTime,
        },
      };
    } catch (error) {
      logger.error('Streaming outline generation failed:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build system prompt for outline generation
   * Note: Currently not used - kept for potential future use
   */
  // private _buildSystemPrompt(_params: OutlineGenerationParams): string {
  //   let prompt = `You are an expert educational content analyst. Create a structured learning outline that breaks down complex documents into digestible sections.`;

  //   if (_params.persona) {
  //     prompt += `\n\nUser Profile:`;
  //     if (_params.persona.currentRole) {
  //       prompt += `\n- Role: ${_params.persona.currentRole}`;
  //     }
  //     if (_params.persona.industry) {
  //       prompt += `\n- Industry: ${_params.persona.industry}`;
  //     }
  //     if (_params.persona.technicalLevel) {
  //       prompt += `\n- Technical Level: ${_params.persona.technicalLevel}`;
  //     }
  //     if (_params.persona.learningStyle) {
  //       prompt += `\n- Learning Style: ${_params.persona.learningStyle}`;
  //     }
  //     if (_params.persona.primaryInterests?.length) {
  //       prompt += `\n- Interests: ${_params.persona.primaryInterests.join(', ')}`;
  //     }
  //   }

  //   prompt += `\n\nCreate ${_params.sectionCount || 4}-6 main sections that progressively build understanding.`;

  //   if (_params.includePageNumbers) {
  //     prompt += ` Include estimated page ranges based on content distribution.`;
  //   }

  //   return prompt;
  // }

  /**
   * Build user prompt for outline generation
   */
  private buildUserPrompt(params: OutlineGenerationParams): string {
    let prompt = `Analyze this document and create a learning outline:\n\n`;

    // Limit content length for API constraints
    const maxContentLength = 6000;
    const content =
      params.content.length > maxContentLength
        ? params.content.substring(0, maxContentLength) + '\n\n[Content truncated for analysis...]'
        : params.content;

    prompt += content;

    prompt += `\n\nFor each section, provide:
1. A clear, descriptive title
2. A brief summary (2-3 sentences)
3. 3-5 key concepts/topics to cover
4. Estimated content distribution

Return a JSON object with this exact structure:
{
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title Here",
      "summary": "Brief description of what this section covers and why it's important.",
      "topics": ["concept1", "concept2", "concept3"],
      "chunkIds": [],
      "chunkCount": 5,
      "startPage": 1,
      "endPage": 10
    }
  ]
}`;

    return prompt;
  }

  /**
   * Parse the AI response into structured outline sections
   */
  private parseOutlineResponse(content: string, params: OutlineGenerationParams): OutlineSection[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON structure found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const sections = parsed.sections || [];

      if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('No valid sections found in response');
      }

      // Format and validate sections
      return sections.map((section: any, index: number) => ({
        id: section.id || `section-${index + 1}`,
        title: section.title || `Section ${index + 1}`,
        summary: section.summary || 'No summary provided',
        topics: Array.isArray(section.topics) ? section.topics : [],
        chunkIds: [], // Will be populated by caller
        chunkCount: section.chunkCount || Math.ceil(params.content.length / sections.length / 1000),
        startPage: section.startPage || index * 10 + 1,
        endPage: section.endPage || (index + 1) * 10,
      }));
    } catch (error) {
      logger.error('Failed to parse outline response:', error);

      // Fallback: create basic sections from content analysis
      return this.createFallbackOutline(params);
    }
  }

  /**
   * Try to parse partial outline content for streaming
   */
  private tryParsePartialOutline(content: string): OutlineSection[] {
    try {
      // Look for complete section objects in partial content
      const sectionMatches = content.match(/\{[^{}]*"id"[^{}]*\}/g);
      if (!sectionMatches) return [];

      const completeSections: OutlineSection[] = [];

      for (const match of sectionMatches) {
        try {
          const section = JSON.parse(match);
          if (section.id && section.title) {
            completeSections.push({
              id: section.id,
              title: section.title,
              summary: section.summary || '',
              topics: section.topics || [],
              chunkIds: [],
              chunkCount: section.chunkCount || 1,
              startPage: section.startPage,
              endPage: section.endPage,
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }

      return completeSections;
    } catch {
      return [];
    }
  }

  /**
   * Create a fallback outline when parsing fails
   */
  private createFallbackOutline(params: OutlineGenerationParams): OutlineSection[] {
    const sectionCount = params.sectionCount || 4;
    const contentLength = params.content.length;
    const wordsPerSection = Math.ceil(contentLength / sectionCount / 5); // Rough words estimate

    const sections: OutlineSection[] = [];

    for (let i = 0; i < sectionCount; i++) {
      sections.push({
        id: `section-${i + 1}`,
        title: `Section ${i + 1}`,
        summary: `Content analysis section ${i + 1}`,
        topics: [`Topic ${i + 1}.1`, `Topic ${i + 1}.2`, `Topic ${i + 1}.3`],
        chunkIds: [],
        chunkCount: Math.ceil(wordsPerSection / 200), // Rough chunk estimate
        startPage: i * 10 + 1,
        endPage: (i + 1) * 10,
      });
    }

    logger.warn('Using fallback outline structure', {
      sectionCount: sections.length,
      contentLength,
    });

    return sections;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch (error) {
      logger.error('Python outline service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pythonOutlineService = new PythonOutlineService();
