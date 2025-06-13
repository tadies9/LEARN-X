# Phase 5: Content-Outline Alignment Strategy

## Overview
This document details how to ensure AI-generated content stays perfectly aligned with pre-computed topics and maintains consistency throughout the learning experience.

## Topic-Content Mapping

### 1. Topic Boundary Enforcement

```typescript
interface TopicBoundaryManager {
  // Each topic has strict chunk boundaries
  topics: Map<string, {
    id: string;
    title: string;
    chunkIds: string[];
    embedding: number[]; // Topic centroid
    keyConcepts: string[];
    scope: string;
  }>;
  
  // Ensure content doesn't drift across topics
  async enforceTopicBoundaries(
    topicId: string,
    generatedContent: string
  ): Promise<ValidationResult> {
    const topic = this.topics.get(topicId);
    const contentEmbedding = await generateEmbedding(generatedContent);
    
    // Check semantic similarity to topic centroid
    const similarity = cosineSimilarity(contentEmbedding, topic.embedding);
    
    // Verify key concepts are covered
    const conceptsCovered = topic.keyConcepts.filter(
      concept => generatedContent.includes(concept)
    );
    
    return {
      isAligned: similarity > 0.75,
      similarity,
      conceptCoverage: conceptsCovered.length / topic.keyC concepts.length,
      suggestions: this.generateAlignmentSuggestions(topic, generatedContent)
    };
  }
}
```

### 2. Dynamic Topic Sizing

```typescript
interface DynamicTopicSizer {
  // Intelligently size topics based on content
  calculateOptimalTopics(document: DocumentAnalysis): TopicPlan {
    const factors = {
      // Document characteristics
      pageCount: document.pageCount,
      wordCount: document.wordCount,
      complexity: document.complexityScore, // 0-1
      
      // Structure hints
      hasTableOfContents: document.toc !== null,
      headingCount: document.headings.length,
      sectionCount: document.sections.length,
      
      // Content density
      averageWordsPerPage: document.wordCount / document.pageCount,
      conceptDensity: document.uniqueConcepts.length / document.wordCount
    };
    
    // Base calculation
    let topicCount = 0;
    
    // Short documents (< 10 pages)
    if (factors.pageCount < 10) {
      topicCount = Math.min(factors.headingCount || 3, 5);
    }
    // Medium documents (10-50 pages)
    else if (factors.pageCount < 50) {
      topicCount = Math.round(factors.pageCount / 4);
    }
    // Long documents (50+ pages)
    else {
      topicCount = Math.round(Math.sqrt(factors.pageCount) * 1.5);
    }
    
    // Respect existing structure
    if (factors.hasTableOfContents) {
      topicCount = Math.max(
        factors.sectionCount,
        Math.round(topicCount * 0.8)
      );
    }
    
    // Complexity adjustment
    topicCount = Math.round(topicCount * (1 + factors.complexity * 0.3));
    
    // Final bounds
    return {
      minTopics: 3,
      maxTopics: 15,
      optimalTopics: Math.max(3, Math.min(15, topicCount)),
      reasoning: this.explainTopicCount(factors, topicCount)
    };
  }
}
```

### 3. Prompt Engineering for Alignment

```typescript
interface AlignedPromptBuilder {
  buildAlignedPrompt(params: {
    topic: Topic;
    subtopic: 'intro' | 'concepts' | 'examples' | 'practice' | 'summary';
    chunks: Chunk[];
    persona: UserPersona;
  }): string {
    const template = `
You are explaining ${params.topic.title} to a ${params.persona.currentRole}.

STRICT BOUNDARIES:
- Only use information from these specific sections: ${params.chunks.map(c => c.pageNumbers).join(', ')}
- Key concepts that MUST be covered: ${params.topic.keyC concepts.join(', ')}
- Scope: ${params.topic.scope}

PERSONALIZATION:
- Use ${params.persona.primaryInterests[0]} analogies when helpful
- Tone: ${params.persona.communicationTone}
- Detail level: ${params.persona.contentDensity}

SECTION: ${params.subtopic}
${this.getSubtopicInstructions(params.subtopic)}

IMPORTANT: Do not reference or explain concepts from other topics in the outline. Stay focused on this specific topic.

Content to explain:
${params.chunks.map(c => c.text).join('\n\n')}
`;
    
    return template;
  }
  
  getSubtopicInstructions(subtopic: string): string {
    const instructions = {
      intro: 'Provide a brief overview and explain why this topic matters to the learner.',
      concepts: 'Explain the key concepts clearly with personalized analogies.',
      examples: 'Provide practical examples relevant to the learner\'s background.',
      practice: 'Create exercises that help reinforce the concepts.',
      summary: 'Summarize the key takeaways in a memorable way.'
    };
    
    return instructions[subtopic];
  }
}
```

### 4. Real-time Alignment Monitoring

```typescript
interface AlignmentMonitor {
  // Monitor content generation in real-time
  async monitorStream(
    stream: AsyncGenerator<string>,
    topic: Topic
  ): AsyncGenerator<AlignedContent> {
    let buffer = '';
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      buffer += chunk;
      chunkCount++;
      
      // Check alignment every N chunks
      if (chunkCount % 10 === 0) {
        const alignment = await this.checkAlignment(buffer, topic);
        
        if (alignment.score < 0.7) {
          // Inject correction guidance
          yield {
            type: 'correction',
            content: `[Refocusing on ${topic.title}...]`
          };
        }
      }
      
      yield {
        type: 'content',
        content: chunk,
        alignmentScore: await this.quickAlignmentCheck(chunk, topic)
      };
    }
  }
}
```

## Examples of Smart Topic Generation

### Example 1: 10-page Article
```typescript
{
  input: {
    pageCount: 10,
    headings: ['Introduction', 'Background', 'Methods', 'Results', 'Discussion'],
    wordCount: 4000
  },
  output: {
    topicCount: 5,
    topics: [
      'Introduction & Context',
      'Background Theory', 
      'Methodology',
      'Key Findings',
      'Implications & Discussion'
    ]
  }
}
```

### Example 2: 200-page Textbook
```typescript
{
  input: {
    pageCount: 200,
    chapters: 12,
    sectionsPerChapter: 4-6,
    wordCount: 80000
  },
  output: {
    topicCount: 12, // Respects chapter structure
    topics: [
      'Chapter 1: Fundamentals',
      'Chapter 2: Core Concepts',
      // ... one topic per chapter
    ]
  }
}
```

### Example 3: 5-page Dense Technical Paper
```typescript
{
  input: {
    pageCount: 5,
    conceptDensity: 'high',
    equations: 15,
    wordCount: 3000
  },
  output: {
    topicCount: 4,
    topics: [
      'Abstract & Introduction',
      'Mathematical Framework',
      'Experimental Design',
      'Results & Conclusion'
    ]
  }
}
```

## Content Generation Safeguards

### 1. Pre-generation Validation
```typescript
interface PreGenerationValidator {
  async validateTopicScope(
    topicId: string,
    requestedContent: ContentRequest
  ): Promise<ValidationResult> {
    const topic = await this.getTopic(topicId);
    
    // Ensure chunks are within topic boundary
    const validChunks = requestedContent.chunks.filter(
      chunk => topic.chunkIds.includes(chunk.id)
    );
    
    if (validChunks.length !== requestedContent.chunks.length) {
      throw new Error('Requested chunks outside topic boundary');
    }
    
    return {
      valid: true,
      scope: topic.scope,
      constraints: topic.constraints
    };
  }
}
```

### 2. Streaming Correction
```typescript
interface StreamingCorrector {
  async *correctStream(
    stream: AsyncGenerator<string>,
    topic: Topic,
    persona: UserPersona
  ): AsyncGenerator<string> {
    const contextWindow = [];
    
    for await (const chunk of stream) {
      contextWindow.push(chunk);
      
      // Keep sliding window of last 10 chunks
      if (contextWindow.length > 10) {
        contextWindow.shift();
      }
      
      // Check if content is drifting
      const context = contextWindow.join('');
      const isDrifting = await this.detectDrift(context, topic);
      
      if (isDrifting) {
        // Inject subtle correction
        yield `\n\nReturning to ${topic.title}, `;
      }
      
      yield chunk;
    }
  }
}
```

## Database Schema for Alignment

```sql
-- Topic-chunk mapping table
CREATE TABLE topic_chunks (
    topic_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    relevance_score FLOAT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (topic_id, chunk_id),
    FOREIGN KEY (chunk_id) REFERENCES file_chunks(id)
);

-- Topic metadata for alignment
CREATE TABLE topic_metadata (
    topic_id UUID PRIMARY KEY,
    file_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    scope TEXT NOT NULL,
    key_concepts TEXT[] NOT NULL,
    centroid_embedding vector(1536),
    chunk_count INTEGER NOT NULL,
    estimated_reading_time INTEGER, -- minutes
    coherence_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Content alignment tracking
CREATE TABLE content_alignment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL,
    generation_id UUID NOT NULL,
    alignment_score FLOAT NOT NULL,
    drift_detected BOOLEAN DEFAULT false,
    corrections_applied INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Metrics for Success

### 1. Alignment Metrics
- **Topic Coherence**: > 0.85 average similarity within topic
- **Cross-topic Leakage**: < 5% content referencing other topics
- **Concept Coverage**: > 90% of key concepts mentioned

### 2. User Experience Metrics
- **Topic Navigation**: Users find desired content in < 3 clicks
- **Content Relevance**: > 95% user satisfaction with topic boundaries
- **Learning Flow**: > 80% complete topics in sequence

### 3. Technical Metrics
- **Clustering Time**: < 500ms for documents up to 100 pages
- **Alignment Checking**: < 50ms per streaming chunk
- **Topic Generation**: < 2s for complete outline