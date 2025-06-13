# Phase 5: AI-Powered Learning Interface Strategy

## Overview
This document outlines the implementation strategy for the AI-powered learning interface, featuring dynamic outline generation, personalized content streaming, and multiple learning modes.

## Updated Model Configuration
- **Embeddings**: `text-embedding-3-small` (1536 dimensions, more efficient than ada-002)
- **Chat/Content**: `gpt-4o` (optimized for speed and quality)

## Core UI Components

### 1. Split-View Learning Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Course Home  │  Progress: 18% ████░░░░ │ 1.2x │ 🔔 │ 👤     │
├─────────────────────┬───────────────────────────────────────────┤
│                     │                                             │
│     OUTLINE         │            MAIN CONTENT                     │
│                     │       [Personalized Stream]                 │
│  ▶ Topic 1         │                                             │
│  ▶ Topic 2         │  ┌─────────────────────────────┐           │
│  ● Topic 3         │  │     Quick Note [...]        │           │
│     └─ Intro       │  └─────────────────────────────┘           │
│     └─ Concepts    │                                             │
│     └─ Examples    │         👍  😐  👎                           │
│     └─ Practice    │                                             │
│     └─ Summary     │                                             │
│  ▶ Topic 4         │                 ▶ CONTEXT ▶                 │
│  ▶ Topic 5         │                                             │
│  ▶ Topic 6         │                                             │
│  ⋮                 │                                             │
└─────────────────────┴───────────────────────────────────────────┘
│ 💾 Save  ⬇ Download  ↻ Regenerate  📊 Analytics  ⚙ Settings    │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Dynamic Outline Generation Strategy

#### Phase 1: Initial Processing
```typescript
interface OutlineGenerationFlow {
  // 1. When user clicks "Explain" on a PDF
  async generateOutline(fileId: string): Promise<Outline> {
    // Extract main topics using GPT-4o
    const chunks = await getFileChunks(fileId);
    const topics = await extractTopics(chunks);
    
    // Stream topics to UI as they're identified
    for (const topic of topics) {
      yield { type: 'topic', data: topic };
    }
    
    // Generate subtopics for each main topic
    for (const topic of topics) {
      const subtopics = await generateSubtopics(topic);
      yield { type: 'subtopics', topicId: topic.id, data: subtopics };
    }
  }
}
```

#### Phase 2: Content Mapping
```typescript
interface ContentMapping {
  topicId: string;
  chunkIds: string[];  // References to document chunks
  concepts: Concept[];
  examples: Example[];
  exercises: Exercise[];
}
```

### 3. Personalized Content Streaming

#### Streaming Architecture
```typescript
// Server-Sent Events for real-time content streaming
GET /api/ai/learn/stream/:fileId

EventSource Flow:
1. event: outline-start
2. event: topic (multiple)
3. event: content-start
4. event: content-chunk (streamed)
5. event: complete
```

#### Content Generation Pipeline
```typescript
interface ContentStream {
  async streamExplanation(params: {
    topicId: string;
    subtopic: 'intro' | 'concepts' | 'examples' | 'practice' | 'summary';
    persona: UserPersona;
    chunkIds: string[];
  }): AsyncGenerator<ContentChunk> {
    // 1. Build personalized prompt
    const prompt = buildPersonalizedPrompt(params);
    
    // 2. Stream from GPT-4o
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });
    
    // 3. Yield formatted chunks
    for await (const chunk of stream) {
      yield formatContentChunk(chunk);
    }
  }
}
```

### 4. Content Type Variations

#### A. Explanation View (Default)
```typescript
interface ExplanationView {
  layout: 'split-view';
  leftPanel: {
    type: 'outline';
    items: Topic[];
    selectedPath: string[]; // e.g., ['topic-3', 'concepts']
  };
  rightPanel: {
    type: 'streaming-content';
    content: {
      header: string;
      body: StreamedContent;
      analogies: AnalogyCallout[];
      quickNote: string;
      reactions: ReactionButtons;
    };
  };
}
```

#### B. Summary View
```typescript
interface SummaryView {
  layout: 'single-column';
  content: {
    type: 'summary';
    format: 'key-points' | 'comprehensive' | 'visual-map';
    sections: SummarySection[];
    exportOptions: ['pdf', 'markdown', 'notion'];
  };
}
```

#### C. Flashcard View
```typescript
interface FlashcardView {
  layout: 'card-stack';
  cards: Flashcard[];
  controls: {
    flip: boolean;
    progress: number;
    difficulty: DifficultyButtons;
    spacedRepetition: NextReviewDate;
  };
}
```

#### D. Quiz View
```typescript
interface QuizView {
  layout: 'question-answer';
  question: {
    type: 'multiple-choice' | 'true-false' | 'short-answer';
    content: string;
    options?: string[];
  };
  feedback: {
    immediate: boolean;
    explanation: string;
    relatedConcepts: Link[];
  };
}
```

### 5. Special UI Components

#### Analogy Callouts
```tsx
interface AnalogyCallout {
  icon: string; // Based on user interests (🏀 for basketball)
  title: string;
  content: string;
  relevantTo: string[]; // User interests matched
}

// Example rendering:
<AnalogyBox icon="🏀" title="Basketball Cap Space">
  Think of discounting cash-flows like adjusting 
  a player's salary to today's cap value...
</AnalogyBox>
```

#### Progress Tracking
```tsx
interface ProgressIndicator {
  overall: number; // 0-100
  currentTopic: {
    completed: string[];
    inProgress: string;
    remaining: string[];
  };
  timeSpent: number;
  velocity: number; // concepts/hour
}
```

### 6. Learning Mode Selector

```tsx
interface LearningModes {
  explain: {
    icon: '📖';
    title: 'Explain';
    description: 'Get personalized explanations';
  };
  summarize: {
    icon: '📝';
    title: 'Summarize';
    description: 'Key points and takeaways';
  };
  flashcards: {
    icon: '🎴';
    title: 'Flashcards';
    description: 'Create study cards';
  };
  quiz: {
    icon: '❓';
    title: 'Quiz';
    description: 'Test your knowledge';
  };
  chat: {
    icon: '💬';
    title: 'Chat';
    description: 'Ask questions';
  };
}
```

## Implementation Strategy

### Phase 1: Core Infrastructure (Days 1-2)
1. **Streaming Endpoint Setup**
   - Implement Server-Sent Events
   - Create streaming controllers
   - Add connection management

2. **Outline Generation Service**
   - Topic extraction algorithm
   - Hierarchical structure builder
   - Chunk-to-topic mapping

### Phase 2: Content Generation (Days 3-4)
1. **Personalized Prompt Builder**
   - Persona integration
   - Context injection
   - Format specifications

2. **Content Streaming Pipeline**
   - GPT-4o integration
   - Response formatting
   - Error recovery

### Phase 3: UI Components (Days 5-7)
1. **Split View Layout**
   - Resizable panels
   - Outline navigation
   - Content container

2. **Learning Mode Components**
   - Mode selector
   - View transitions
   - State management

3. **Interactive Elements**
   - Reaction buttons
   - Note-taking widget
   - Progress indicators

### Phase 4: Advanced Features (Days 8-10)
1. **Smart Caching**
   - Outline caching
   - Content prefetching
   - Offline support

2. **Analytics Integration**
   - Engagement tracking
   - Learning velocity
   - Concept mastery

## API Endpoints

### Outline Generation
```typescript
POST /api/ai/learn/generate-outline
Body: { fileId: string }
Response: { outlineId: string, status: 'processing' }

GET /api/ai/learn/outline/:outlineId/stream
Response: EventSource (topics streamed as generated)
```

### Content Streaming
```typescript
GET /api/ai/learn/explain/stream
Query: { 
  fileId: string,
  topicId: string,
  subtopic: string,
  mode: 'explain' | 'summarize' | 'flashcards' | 'quiz'
}
Response: EventSource (content streamed)
```

### User Interactions
```typescript
POST /api/ai/learn/feedback
Body: { 
  contentId: string,
  reaction: 'positive' | 'neutral' | 'negative',
  note?: string
}

POST /api/ai/learn/regenerate
Body: { 
  contentId: string,
  feedback?: string
}
```

## Frontend State Management

```typescript
interface LearningSessionState {
  // File & Outline
  fileId: string;
  outline: Outline;
  selectedPath: string[];
  
  // Content
  currentContent: StreamedContent;
  contentCache: Map<string, CachedContent>;
  
  // User State
  notes: Map<string, string>;
  reactions: Map<string, Reaction>;
  progress: ProgressData;
  
  // UI State
  mode: LearningMode;
  panelSizes: { left: number; right: number };
  settings: UserPreferences;
}
```

## Performance Optimizations

### 1. Concurrent Processing
- Generate outline while processing embeddings
- Stream content as it's generated
- Prefetch next likely topics

### 2. Smart Caching
```typescript
interface CacheStrategy {
  outline: {
    ttl: '1 hour';
    storage: 'localStorage';
  };
  content: {
    ttl: '30 minutes';
    storage: 'indexedDB';
  };
  embeddings: {
    ttl: 'permanent';
    storage: 'backend';
  };
}
```

### 3. Progressive Enhancement
- Show outline skeleton immediately
- Stream topics as they're identified
- Load content on-demand
- Lazy-load advanced features

## Error Handling & Recovery

```typescript
interface ErrorRecovery {
  streamInterrupted: {
    action: 'resume-from-last-chunk';
    fallback: 'show-cached-content';
  };
  generationFailed: {
    action: 'retry-with-fallback-model';
    fallback: 'show-basic-summary';
  };
  outlineIncomplete: {
    action: 'continue-processing';
    fallback: 'show-partial-outline';
  };
}
```

## Mobile Responsiveness

### Tablet View
- Side-by-side layout maintained
- Touch-friendly controls
- Swipe navigation

### Phone View
- Stacked layout
- Bottom sheet for outline
- Swipe between sections
- Simplified controls

## Accessibility

- Keyboard navigation for outline
- Screen reader announcements for updates
- High contrast mode support
- Reduced motion options
- Font size controls

## Success Metrics

1. **Engagement**
   - Time spent in explain mode
   - Outline navigation patterns
   - Content regeneration rate

2. **Learning Effectiveness**
   - Quiz scores after explanations
   - Flashcard retention rates
   - Concept mastery tracking

3. **Performance**
   - Time to first topic
   - Content streaming latency
   - Cache hit rates