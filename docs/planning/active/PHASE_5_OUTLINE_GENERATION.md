# Phase 5: Smart Outline Generation Strategy

## Overview
Since embeddings are already created during file upload (Phase 4), we can use a hybrid approach combining semantic search with document structure analysis for intelligent outline generation.

## Outline Generation Algorithm

### 1. Smart Topic Quantity Determination

```typescript
interface TopicQuantityAnalyzer {
  determineOptimalTopicCount(params: {
    totalChunks: number;
    documentPages: number;
    contentDensity: number; // words per page
    existingHeadings: number;
    documentType: 'textbook' | 'article' | 'paper' | 'manual';
  }): number {
    // Base calculation
    let baseTopics = Math.ceil(params.totalChunks / 10); // ~10 chunks per topic
    
    // Adjust for document type
    const typeMultipliers = {
      'textbook': 1.2,  // More topics for educational content
      'article': 0.8,   // Fewer topics for articles
      'paper': 0.9,     // Academic papers moderate
      'manual': 1.1     // Technical manuals need more
    };
    
    baseTopics *= typeMultipliers[params.documentType] || 1;
    
    // Consider existing structure
    if (params.existingHeadings > 0) {
      // Respect document's natural structure
      baseTopics = Math.max(params.existingHeadings, baseTopics * 0.8);
    }
    
    // Bounds: minimum 3, maximum 15 topics
    return Math.max(3, Math.min(15, Math.round(baseTopics)));
  }
}

interface OutlineGenerator {
  async generateOutline(fileId: string): AsyncGenerator<OutlineTopic> {
    // 1. Load pre-computed data
    const embeddings = await getFileEmbeddings(fileId);
    const chunks = await getFileChunks(fileId);
    const metadata = await getFileMetadata(fileId);
    
    // 2. Determine optimal topic count
    const optimalTopicCount = this.determineOptimalTopicCount({
      totalChunks: chunks.length,
      documentPages: metadata.pageCount,
      contentDensity: metadata.wordsPerPage,
      existingHeadings: metadata.headings.length,
      documentType: metadata.documentType
    });
    
    // 3. Topic Discovery via Constrained Clustering
    const topicClusters = await this.clusterChunks(embeddings, {
      targetClusters: optimalTopicCount,
      minClusterSize: 3,
      maxClusterSize: 20
    });
    
    // 4. Structure Enhancement & Alignment
    const structuredOutline = await this.enhanceWithStructure({
      clusters: topicClusters,
      headings: metadata.headings,
      toc: metadata.tableOfContents,
      chunks: chunks
    });
    
    // 5. Stream topics as they're identified
    for (const topic of structuredOutline) {
      yield topic;
    }
  }
}
```

### 2. Content Alignment Strategy

```typescript
interface ContentAlignmentService {
  // Ensure generated content matches pre-computed outline
  async alignContentToOutline(params: {
    topicId: string;
    subtopic: string;
    relevantChunks: Chunk[];
    userPersona: UserPersona;
  }): Promise<AlignedPrompt> {
    // 1. Get the exact chunks that formed this topic
    const topicChunks = await this.getTopicChunks(params.topicId);
    
    // 2. Build constraints for GPT-4o
    const constraints = {
      mustCover: extractKeyPoints(topicChunks),
      chunkBoundaries: topicChunks.map(c => c.id),
      scopeLimit: `Stay within the scope of: ${params.subtopic}`,
      lengthGuide: this.calculateContentLength(topicChunks.length)
    };
    
    // 3. Create aligned prompt
    return {
      systemPrompt: this.buildSystemPrompt(params.userPersona),
      userPrompt: this.buildAlignedPrompt({
        chunks: topicChunks,
        subtopic: params.subtopic,
        constraints,
        persona: params.userPersona
      }),
      streamingConfig: {
        temperature: 0.7,
        maxTokens: constraints.lengthGuide.maxTokens
      }
    };
  }
}

interface SemanticClustering {
  async clusterChunks(
    embeddings: Embedding[],
    config: ClusterConfig
  ): Promise<TopicCluster[]> {
    // Use constrained K-means for predictable topic count
    const clusters = await performConstrainedClustering(embeddings, {
      k: config.targetClusters,
      minClusterSize: config.minClusterSize,
      maxClusterSize: config.maxClusterSize,
      metric: 'cosine',
      maxIterations: 100
    });
    
    // Post-process clusters
    return clusters.map(cluster => ({
      id: generateTopicId(),
      centroid: cluster.centroid,
      chunks: cluster.chunks,
      chunkIds: cluster.chunks.map(c => c.id), // Track exact chunks
      coherenceScore: calculateCoherence(cluster),
      keywords: extractKeywords(cluster.chunks),
      suggestedTitle: generateTitle(cluster),
      estimatedReadingTime: estimateReadingTime(cluster.chunks)
    }));
  }
}

### 3. Structure-Aware Enhancement

```typescript
interface StructureEnhancer {
  async enhanceWithStructure(params: {
    clusters: TopicCluster[];
    headings: Heading[];
    toc: TableOfContents;
    chunks: Chunk[];
  }): Promise<OutlineTopic[]> {
    // 1. Map clusters to document structure
    const mappedTopics = mapClustersToHeadings(
      params.clusters,
      params.headings
    );
    
    // 2. Preserve logical flow from original document
    const orderedTopics = preserveDocumentFlow(
      mappedTopics,
      params.toc
    );
    
    // 3. Generate subtopics for each main topic
    return Promise.all(
      orderedTopics.map(async topic => ({
        ...topic,
        subtopics: await generateSubtopics(topic, params.chunks)
      }))
    );
  }
}
```

### 4. Real-time Streaming Implementation

```typescript
class OutlineStreamingService {
  async *streamOutline(fileId: string) {
    const embeddings = await this.embeddingService.getForFile(fileId);
    const chunks = await this.chunkService.getForFile(fileId);
    
    // Phase 1: Quick topic identification (0-500ms)
    // Use pre-computed metadata for immediate topics
    const quickTopics = await this.extractQuickTopics(chunks);
    for (const topic of quickTopics) {
      yield { type: 'quick-topic', data: topic };
    }
    
    // Phase 2: Semantic clustering (500ms-1s)
    // Run clustering in background while showing quick topics
    const semanticClusters = await this.clusterEmbeddings(embeddings);
    
    // Phase 3: Enhanced outline (1s-2s)
    // Merge and enhance with semantic understanding
    const enhancedOutline = await this.mergeAndEnhance(
      quickTopics,
      semanticClusters
    );
    
    for (const topic of enhancedOutline) {
      yield { type: 'enhanced-topic', data: topic };
    }
    
    // Phase 4: Subtopic generation (continues async)
    for (const topic of enhancedOutline) {
      const subtopics = await this.generateSubtopics(topic);
      yield { type: 'subtopics', topicId: topic.id, data: subtopics };
    }
  }
}
```

## Optimization Strategies

### 1. Pre-computation During Upload

```typescript
// During file processing (Phase 4), pre-compute:
interface PrecomputedData {
  embeddings: Embedding[];
  headingEmbeddings: Map<string, Embedding>; // For quick matching
  topicKeywords: string[][]; // Extracted keywords per chunk
  structuralHints: {
    headings: Heading[];
    sections: Section[];
    lists: ListItem[];
  };
}
```

### 2. Caching Strategy

```typescript
interface OutlineCache {
  // Cache generated outlines
  async getCachedOutline(fileId: string): Promise<Outline | null> {
    return redis.get(`outline:${fileId}`);
  }
  
  // Cache topic clusters
  async getCachedClusters(embeddingHash: string): Promise<Clusters | null> {
    return redis.get(`clusters:${embeddingHash}`);
  }
  
  // Warm cache on file upload completion
  async warmCache(fileId: string): Promise<void> {
    // Pre-generate outline in background after upload
    const outline = await this.generateOutline(fileId);
    await redis.set(`outline:${fileId}`, outline, 'EX', 3600);
  }
}
```

### 3. Progressive Enhancement

```typescript
interface ProgressiveOutline {
  // Level 1: Immediate (from metadata)
  quick: {
    source: 'metadata';
    topics: string[];
    confidence: 'low';
  };
  
  // Level 2: Fast (from embeddings)
  semantic: {
    source: 'clustering';
    topics: TopicCluster[];
    confidence: 'medium';
  };
  
  // Level 3: Complete (with GPT-4o enhancement)
  enhanced: {
    source: 'ai-enhanced';
    topics: EnhancedTopic[];
    confidence: 'high';
  };
}
```

## Implementation Example

```typescript
// Backend endpoint
app.get('/api/learn/outline/:fileId/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const generator = outlineService.streamOutline(req.params.fileId);
  
  for await (const event of generator) {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }
});

// Frontend consumption
const eventSource = new EventSource(`/api/learn/outline/${fileId}/stream`);

eventSource.addEventListener('quick-topic', (e) => {
  const topic = JSON.parse(e.data);
  // Add to outline immediately
  appendToOutline(topic);
});

eventSource.addEventListener('enhanced-topic', (e) => {
  const topic = JSON.parse(e.data);
  // Update with enhanced version
  updateOutlineTopic(topic);
});

eventSource.addEventListener('subtopics', (e) => {
  const { topicId, data } = JSON.parse(e.data);
  // Add subtopics to existing topic
  addSubtopics(topicId, data);
});
```

## Smart Subtopic Generation

```typescript
const STANDARD_SUBTOPICS = {
  intro: {
    title: 'Introduction',
    prompt: 'Overview and context',
    icon: '📖'
  },
  concepts: {
    title: 'Key Concepts',
    prompt: 'Core ideas and definitions',
    icon: '💡'
  },
  examples: {
    title: 'Examples',
    prompt: 'Practical illustrations',
    icon: '📋'
  },
  practice: {
    title: 'Practice',
    prompt: 'Exercises and applications',
    icon: '✏️'
  },
  summary: {
    title: 'Summary',
    prompt: 'Key takeaways',
    icon: '📌'
  }
};

async function generateSubtopics(topic: Topic, chunks: Chunk[]) {
  // Find chunks relevant to this topic
  const relevantChunks = await findRelevantChunks(topic, chunks);
  
  // Determine which standard subtopics apply
  const applicableSubtopics = [];
  
  // Always include intro and summary
  applicableSubtopics.push(STANDARD_SUBTOPICS.intro);
  applicableSubtopics.push(STANDARD_SUBTOPICS.summary);
  
  // Check if concepts exist
  if (hasConceptualContent(relevantChunks)) {
    applicableSubtopics.push(STANDARD_SUBTOPICS.concepts);
  }
  
  // Check if examples exist
  if (hasExamples(relevantChunks)) {
    applicableSubtopics.push(STANDARD_SUBTOPICS.examples);
  }
  
  // Add practice if applicable
  if (isPractical(relevantChunks)) {
    applicableSubtopics.push(STANDARD_SUBTOPICS.practice);
  }
  
  return applicableSubtopics;
}
```

## Performance Metrics

### Target Performance
- **Time to first topic**: < 100ms
- **Complete outline**: < 2s
- **Subtopic generation**: < 3s
- **Full enhancement**: < 5s

### Optimization Techniques
1. **Parallel Processing**
   - Cluster embeddings while fetching metadata
   - Generate subtopics for multiple topics concurrently
   
2. **Smart Caching**
   - Cache outline for 1 hour
   - Cache cluster results for 24 hours
   - Warm cache on file upload
   
3. **Progressive Loading**
   - Show structure immediately
   - Enhance with semantic data
   - Add AI improvements last

## Error Handling

```typescript
interface OutlineErrorHandling {
  noEmbeddings: {
    fallback: 'use-chunk-text-analysis';
    message: 'Generating outline from text...';
  };
  
  clusteringFailed: {
    fallback: 'use-document-structure';
    message: 'Using document structure...';
  };
  
  aiEnhancementFailed: {
    fallback: 'use-basic-outline';
    message: 'Showing simplified outline...';
  };
}
```