# Phase 5: AI Integration & Personalization - Unified Implementation Plan

## Overview
This unified document consolidates all Phase 5 planning into a single, actionable reference. Based on project requirements and practical constraints, we've simplified the approach while keeping essential features.

**Timeline**: 2 weeks (Week 5-6)  
**Total Tasks**: 32 (8 per section)

## Core Principles
1. **Leverage existing work** - Use embeddings from Phase 4, personas from Phase 3
2. **Start simple** - MVP first, enhance based on feedback
3. **Keep essentials** - Hybrid search, cost tracking, real personalization
4. **Defer complexity** - No A/B testing, complex metrics, or LRU caching

## Week 1: Foundation (OpenAI + Embeddings)

### Day 1-2: OpenAI Integration Setup

#### Task 5.1.1: Set up OpenAI client
```typescript
// backend/src/services/openai/OpenAIService.ts
import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
}
```
**Time**: 2-3 hours
**Dependencies**: Environment variables, OpenAI package

#### Task 5.1.2: Create prompt template system
```typescript
// backend/src/services/ai/PromptTemplates.ts
interface PromptTemplate {
  explain: (persona: UserPersona, content: string) => string;
  summarize: (persona: UserPersona, content: string) => string;
  flashcard: (content: string) => string;
  quiz: (content: string, type: QuizType) => string;
}
```
**Time**: 4-5 hours
**Dependencies**: Persona data structure from Phase 3

#### Task 5.1.3: Implement token counting
```typescript
// backend/src/services/ai/TokenCounter.ts
import { encoding_for_model } from 'tiktoken';

export function countTokens(text: string, model: string = 'gpt-4o'): number {
  const encoding = encoding_for_model(model);
  return encoding.encode(text).length;
}
```
**Time**: 2-3 hours
**Dependencies**: tiktoken package

#### Task 5.1.4: Add rate limiting
```typescript
// backend/src/middleware/rateLimiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ai_rate_limit',
  points: 20, // requests
  duration: 60, // per minute
});
```
**Time**: 3-4 hours
**Dependencies**: Redis, rate-limiter-flexible

### Day 3: Cost Tracking & Caching

#### Task 5.1.5: Create cost tracking dashboard
```typescript
// Database schema
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  model VARCHAR(50),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

// Dashboard queries
- Daily cost by user
- Total monthly spend
- Model usage breakdown
- Cost trends
```
**Time**: 6-8 hours
**Dependencies**: Database, frontend charts library

#### Task 5.1.6-7: Implement caching
```typescript
// backend/src/services/cache/AICache.ts
export class AICache {
  async get(key: string): Promise<string | null> {
    return redis.get(`ai_cache:${key}`);
  }
  
  async set(key: string, value: string, ttl: number = 3600) {
    return redis.setex(`ai_cache:${key}`, ttl, value);
  }
}
```
**Time**: 6-8 hours (combined for both tasks)
**Dependencies**: Redis

#### Task 5.1.8: Error handling
```typescript
// backend/src/services/ai/ErrorHandler.ts
export class AIErrorHandler {
  handle(error: OpenAIError): AIResponse {
    if (error.code === 'rate_limit_exceeded') {
      return { error: 'Please try again in a moment', retry: true };
    }
    // Log to monitoring
    logger.error('AI Service Error', error);
    return { error: 'Something went wrong', retry: false };
  }
}
```
**Time**: 3-4 hours
**Dependencies**: Logger service

### Day 4-5: Embeddings & Search

#### Task 5.2.1-2: Embedding service with batching
```typescript
// backend/src/services/embeddings/EmbeddingService.ts
export class EmbeddingService {
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }
  
  async processBatch(chunks: Chunk[]) {
    const batchSize = 50; // Reasonable batch size
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await this.generateEmbeddings(batch.map(c => c.text));
      await this.storeEmbeddings(batch, embeddings);
    }
  }
}
```
**Time**: 7-8 hours (combined)
**Dependencies**: OpenAI client, database

#### Task 5.2.3-4: Embedding storage and caching
```sql
-- Already exists from Phase 4
CREATE TABLE chunk_embeddings (
  chunk_id UUID PRIMARY KEY,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embeddings ON chunk_embeddings 
USING hnsw (embedding vector_cosine_ops);
```
**Time**: 5-6 hours (combined)
**Dependencies**: pgvector, Phase 4 schema

#### Task 5.2.5-6: Hybrid search implementation
```typescript
// backend/src/services/search/HybridSearch.ts
export class HybridSearchService {
  async search(query: string, fileId: string): Promise<SearchResult[]> {
    // Parallel execution
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(query, fileId),
      this.keywordSearch(query, fileId)
    ]);
    
    // Simple weighted merge (70% semantic, 30% keyword)
    return this.mergeResults(semanticResults, keywordResults, 0.7, 0.3);
  }
  
  private async semanticSearch(query: string, fileId: string) {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    return db.query(`
      SELECT chunk_id, content, 1 - (embedding <=> $1) as similarity
      FROM chunk_embeddings ce
      JOIN file_chunks fc ON ce.chunk_id = fc.id
      WHERE fc.file_id = $2
      ORDER BY similarity DESC
      LIMIT 20
    `, [queryEmbedding, fileId]);
  }
  
  private async keywordSearch(query: string, fileId: string) {
    return db.query(`
      SELECT chunk_id, content, 
             ts_rank(to_tsvector('english', content), 
                    plainto_tsquery('english', $1)) as rank
      FROM file_chunks
      WHERE file_id = $2 
        AND to_tsvector('english', content) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 20
    `, [query, fileId]);
  }
}
```
**Time**: 8-9 hours (combined)
**Dependencies**: PostgreSQL full-text search, pgvector

#### Task 5.2.7-8: Basic scoring and logging
```typescript
// Simple scoring - no complex algorithms
const finalScore = (similarity * 0.7) + (recency * 0.3);

// Basic query logging
await db.query(
  'INSERT INTO search_logs (query, results_count, user_id) VALUES ($1, $2, $3)',
  [query, results.length, userId]
);
```
**Time**: 4-5 hours (combined)
**Dependencies**: Database schema

## Week 2: Personalization & Content Generation

### Day 1-2: Personalization Engine

#### Task 5.3.1: Persona-based prompt generation
```typescript
// backend/src/services/personalization/PersonaPromptBuilder.ts
export class PersonaPromptBuilder {
  buildPrompt(template: string, persona: UserPersona, content: string): string {
    return template
      .replace('{role}', persona.currentRole)
      .replace('{interests}', persona.primaryInterests.join(', '))
      .replace('{tone}', this.getToneInstruction(persona.communicationTone))
      .replace('{density}', this.getDensityInstruction(persona.contentDensity))
      .replace('{content}', content);
  }
}
```
**Time**: 4-5 hours
**Dependencies**: Persona types from Phase 3

#### Task 5.3.2: Dynamic analogy generation
```typescript
// backend/src/services/personalization/AnalogyGenerator.ts
export class AnalogyGenerator {
  async generateAnalogy(concept: string, userInterests: string[]): Promise<string> {
    const prompt = `
      Create a clear analogy for "${concept}" using ${userInterests[0]}.
      Make it natural and helpful for understanding.
      Keep it concise (2-3 sentences).
    `;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    
    return response.choices[0].message.content;
  }
}
```
**Time**: 5-6 hours
**Dependencies**: OpenAI service, user persona

#### Task 5.3.3-4: Content density and tone adjustment
```typescript
// Two simple density modes
enum ContentDensity {
  CONCISE = 'concise',
  COMPREHENSIVE = 'comprehensive'
}

// Five basic tones
enum CommunicationTone {
  FORMAL = 'formal',
  PROFESSIONAL = 'professional', 
  FRIENDLY = 'friendly',
  CASUAL = 'casual',
  ACADEMIC = 'academic'
}

const densityInstructions = {
  concise: 'Be brief and to the point. Use bullet points.',
  comprehensive: 'Provide detailed explanations with examples.'
};

const toneInstructions = {
  formal: 'Use formal language and professional terminology.',
  friendly: 'Be warm and encouraging, like explaining to a friend.',
  // etc.
};
```
**Time**: 6-7 hours (combined)
**Dependencies**: User preferences

#### Task 5.3.5-8: Simple features (no complex algorithms)
```typescript
// Simple example selection - just filter by topic
const relevantExamples = examples.filter(e => e.topic === currentTopic);
const selected = relevantExamples.slice(0, 3); // Take first 3

// Basic personalization cache
await redis.setex(`personalized:${userId}:${contentId}`, 3600, result);

// User feedback instead of A/B testing
interface Feedback {
  helpful: boolean;
  analogyRating: 1 | 2 | 3 | 4 | 5;
  comments?: string;
}

// Basic engagement tracking
const metrics = {
  sessionDuration: endTime - startTime,
  completionRate: viewedChunks / totalChunks,
  feedbackScore: feedback.rating
};
```
**Time**: 12-14 hours (combined for all 4 tasks)
**Dependencies**: Redis, feedback system

### Day 3-4: Content Generation

#### Task 5.4.1: SSE streaming endpoint
```typescript
// backend/src/controllers/StreamController.ts
export class StreamController {
  async streamExplanation(req: Request, res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const stream = await this.aiService.generateStream(req.body);
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
```
**Time**: 4-5 hours
**Dependencies**: Express, OpenAI streaming

#### Task 5.4.2: Personalized explanation generator
```typescript
// backend/src/services/content/ExplanationGenerator.ts
export class ExplanationGenerator {
  async generate(params: {
    chunks: Chunk[];
    topic: string;
    persona: UserPersona;
  }): AsyncGenerator<string> {
    const prompt = this.promptBuilder.build({
      template: EXPLANATION_TEMPLATE,
      persona: params.persona,
      content: params.chunks.map(c => c.text).join('\n'),
      topic: params.topic
    });
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });
    
    for await (const part of stream) {
      yield part.choices[0]?.delta?.content || '';
    }
  }
}
```
**Time**: 5-6 hours
**Dependencies**: Prompt builder, OpenAI

#### Task 5.4.3-6: Content generation services
```typescript
// Summary generation with formats
interface SummaryFormat {
  keyPoints: string[];      // Bullet points
  comprehensive: string;    // Paragraph form
  visual: object;          // Mind map structure
}

// Flashcard generation
interface Flashcard {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

// Quiz generation
interface QuizQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

// Practice problems
interface PracticeProblem {
  problem: string;
  hints: string[];
  solution: string;
  explanation: string;
}
```
**Time**: 18-20 hours (combined for all 4 tasks)
**Dependencies**: Content understanding, GPT-4o

#### Task 5.4.7-8: Citation and quality validation
```typescript
// Citation preservation
interface GeneratedContent {
  text: string;
  citations: Array<{
    chunkId: string;
    startChar: number;
    endChar: number;
    originalText: string;
  }>;
}

// Quality validation (simplified)
export class QualityValidator {
  validate(generated: string, source: string[]): ValidationResult {
    // Check factual accuracy (no hallucinations)
    const accuracy = this.checkFactualAccuracy(generated, source);
    
    // Check safety (no inappropriate content)
    const safety = this.checkSafety(generated);
    
    return {
      passed: accuracy >= 0.98 && safety === 1.0,
      accuracy,
      safety,
      issues: []
    };
  }
}
```
**Time**: 7-8 hours (combined)
**Dependencies**: Source tracking, validation rules

### Day 5: Integration & Testing

#### Final Integration Tasks:
1. Connect all services
2. End-to-end testing
3. Performance optimization
4. Bug fixes
5. Documentation

**Time**: 8-10 hours

## Database Schema Updates

```sql
-- AI request tracking
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  request_type VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  cost DECIMAL(10,6),
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User feedback
CREATE TABLE content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL,
  helpful BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Search logs
CREATE TABLE search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER,
  clicked_results UUID[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

```typescript
// AI Content Generation
POST   /api/ai/explain        // Generate explanation
POST   /api/ai/summarize      // Create summary
POST   /api/ai/flashcards     // Generate flashcards
POST   /api/ai/quiz           // Create quiz
GET    /api/ai/stream/:type   // SSE streaming endpoint

// Search
GET    /api/search            // Hybrid search
POST   /api/search/feedback   // Log clicked results

// Analytics
GET    /api/ai/costs          // Cost dashboard data
GET    /api/ai/usage          // Usage statistics
POST   /api/ai/feedback       // Submit feedback
```

## Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_CHAT=gpt-4o
OPENAI_MODEL_EMBEDDING=text-embedding-3-small

# Rate Limiting
AI_RATE_LIMIT_PER_MINUTE=20
AI_RATE_LIMIT_PER_HOUR=100

# Costs
AI_DAILY_BUDGET_USD=50
AI_USER_DAILY_LIMIT_USD=5

# Caching
AI_CACHE_TTL_SECONDS=3600
```

## Success Metrics

### Week 1 Milestones:
- ✅ OpenAI integration working
- ✅ Cost tracking functional
- ✅ Embeddings generating
- ✅ Hybrid search returning results

### Week 2 Milestones:
- ✅ Personalized content streaming
- ✅ Explain mode fully functional
- ✅ User feedback collected
- ✅ Quality validation passing

### Final Success Criteria:
- Response time < 2s for first content
- Cost per user < $0.10/day
- Search accuracy > 90%
- User satisfaction > 4/5

## Risk Mitigation

1. **Cost Overrun**: Hard limits, monitoring alerts
2. **Poor Search Results**: Fallback to keyword search
3. **Slow Streaming**: Pre-generate first paragraph
4. **Quality Issues**: Manual review queue

## Post-Phase 5 Enhancements

Once core functionality is stable:
1. Add more learning modes
2. Implement advanced caching
3. Build recommendation engine
4. Add collaborative features
5. Optimize for mobile

---

This unified plan provides a clear, achievable path for Phase 5 implementation within the 2-week timeline, focusing on essential features while maintaining flexibility for future enhancements.