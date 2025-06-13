# Phase 6: Study Experience & Tools - Implementation Plan

## Overview
Phase 6 builds the interactive study experience on top of Phase 5's AI backend. We'll create a split-screen interface with original content on one side and AI-personalized content on the other, along with study tools and real-time chat.

**Timeline**: 1 week (Week 7)
**Dependencies**: Phase 5 AI services fully implemented

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Study Interface                       │
├─────────────────────┬───────────────────┬──────────────────┤
│   Original Content  │  Personalized AI  │   AI Assistant   │
│   (PDF/Document)    │  (Explanations)   │   (Chat Panel)   │
├─────────────────────┴───────────────────┴──────────────────┤
│                    Study Tools Bar                          │
│  [Explain] [Summarize] [Flashcards] [Quiz] [Notes]        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Day 1: Split-Screen Study View

#### 1. Create Study Page Structure
```typescript
// frontend/src/app/(dashboard)/courses/[id]/study/[fileId]/page.tsx
interface StudyPageProps {
  params: {
    id: string;      // courseId
    fileId: string;  // specific file to study
  };
}
```

#### 2. Build Split-View Layout Component
```typescript
// frontend/src/components/study/StudyLayout.tsx
interface StudyLayoutProps {
  courseId: string;
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'doc' | 'ppt' | 'txt';
}

// Features:
- Resizable panels (using react-resizable-panels)
- Collapsible AI panel
- Full-screen mode
- Mobile responsive design
```

#### 3. Integrate Original Content Viewer
```typescript
// frontend/src/components/study/ContentViewer.tsx
- PDF viewer (already exists, needs enhancement)
- Document viewer for other formats
- Highlighting support
- Zoom controls
- Page navigation
```

### Day 2: AI Content Panel & Streaming

#### 1. Create Personalized Content Panel
```typescript
// frontend/src/components/study/PersonalizedPanel.tsx
interface PersonalizedPanelProps {
  fileId: string;
  selectedText?: string;
  currentPage?: number;
}

// Features:
- Dynamic outline from embeddings
- Content streaming display
- Mode selector (Explain/Summarize/etc)
- Loading states
```

#### 2. Implement Content Streaming
```typescript
// frontend/src/hooks/useContentStream.ts
export function useContentStream() {
  const streamContent = async (params: {
    type: 'explain' | 'summarize';
    fileId: string;
    topicId?: string;
    selectedText?: string;
  }) => {
    const response = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse SSE data and update UI
    }
  };
}
```

#### 3. Build Dynamic Outline Generator
```typescript
// frontend/src/components/study/OutlineGenerator.tsx
- Fetch file chunks with embeddings
- Group by topics using clustering
- Generate hierarchical outline
- Click to navigate to section
- Show AI-generated summaries per section
```

### Day 3: Study Tools & Interactivity

#### 1. Implement Synchronized Features
```typescript
// frontend/src/hooks/useSyncedScrolling.ts
- Sync scroll position between panels
- Highlight corresponding sections
- Track reading position
- Auto-advance personalized content
```

#### 2. Add Highlighting & Annotations
```typescript
// frontend/src/components/study/AnnotationLayer.tsx
interface Annotation {
  id: string;
  fileId: string;
  text: string;
  position: { page: number; x: number; y: number };
  color: string;
  note?: string;
  createdAt: Date;
}

// Features:
- Text selection and highlighting
- Color-coded highlights
- Add notes to highlights
- Export annotations
```

#### 3. Build Note-Taking Interface
```typescript
// frontend/src/components/study/NotesPanel.tsx
- Rich text editor (using Tiptap)
- Auto-save to database
- Link notes to specific content
- Search notes
- Export as Markdown
```

### Day 4: AI Chat Assistant

#### 1. Enhance Chat Interface
```typescript
// frontend/src/components/study/StudyChat.tsx
// Enhance existing AIChat component with:
- Context awareness (current page/selection)
- Suggested questions based on content
- Citation links to source material
- Code syntax highlighting
- Math equation rendering
```

#### 2. Implement Context-Aware Responses
```typescript
// frontend/src/hooks/useContextualChat.ts
const getContext = () => {
  return {
    currentPage: viewer.getCurrentPage(),
    selectedText: viewer.getSelectedText(),
    recentChunks: getVisibleChunks(),
    studyMode: currentMode,
  };
};
```

#### 3. Add Smart Suggestions
```typescript
// Generate questions based on:
- Current content complexity
- User's learning progress
- Common confusion points
- Persona preferences
```

### Day 5: Study Tools Implementation

#### 1. Flashcard Interface
```typescript
// frontend/src/components/study/FlashcardMode.tsx
interface FlashcardModeProps {
  fileId: string;
  onGenerate: () => void;
  onPractice: (cards: Flashcard[]) => void;
}

// Features:
- Generate from selected text
- Spaced repetition algorithm
- Progress tracking
- Import/Export (Anki format)
```

#### 2. Quiz Interface
```typescript
// frontend/src/components/study/QuizMode.tsx
// Enhance existing QuizComponent with:
- Dynamic question generation
- Multiple question types
- Timed mode
- Detailed explanations
- Performance analytics
```

#### 3. Study Statistics
```typescript
// frontend/src/components/study/StudyStats.tsx
interface StudyStats {
  timeSpent: number;
  pagesRead: number;
  questionsAsked: number;
  quizScore: number;
  flashcardsReviewed: number;
  notesCreated: number;
}

// Real-time tracking dashboard
```

### Day 6: Progress & Export

#### 1. Session Persistence
```typescript
// frontend/src/hooks/useStudySession.ts
- Save scroll position
- Remember active mode
- Persist highlights
- Cache AI responses
- Resume interrupted sessions
```

#### 2. Progress Tracking
```typescript
// backend/src/services/ProgressService.ts
interface Progress {
  fileId: string;
  userId: string;
  completedSections: string[];
  readingTime: number;
  lastPosition: { page: number; scroll: number };
  engagement: {
    questionsAsked: number;
    flashcardsCreated: number;
    notesWritten: number;
  };
}
```

#### 3. Content Export
```typescript
// frontend/src/components/study/ExportModal.tsx
Export formats:
- PDF with annotations
- Markdown notes
- Flashcards (CSV/Anki)
- Study guide (personalized summary)
- Full transcript with Q&A
```

### Day 7: Integration & Polish

#### 1. Performance Optimization
- Lazy load PDF pages
- Prefetch next content
- Cache AI responses
- Optimize re-renders

#### 2. Mobile Responsiveness
- Stack panels vertically
- Touch gestures
- Simplified toolbar
- Offline support

#### 3. Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode
- Font size controls

## API Integration Points

### Backend Endpoints Needed
```typescript
// Outline generation
GET /api/ai/outline/:fileId

// Chunk retrieval
GET /api/files/:fileId/chunks?page=1&topic=introduction

// Progress tracking
POST /api/progress/update
GET /api/progress/:fileId

// Annotations
POST /api/annotations
GET /api/annotations/:fileId

// Study sessions
POST /api/sessions/save
GET /api/sessions/:fileId/latest
```

### Frontend API Hooks
```typescript
// frontend/src/lib/api/study.ts
export const studyApi = {
  getOutline: (fileId: string) => client.get(`/ai/outline/${fileId}`),
  streamExplanation: (params: ExplainParams) => streamClient.post('/ai/explain', params),
  saveProgress: (data: Progress) => client.post('/progress/update', data),
  getAnnotations: (fileId: string) => client.get(`/annotations/${fileId}`),
};
```

## Database Schema Updates

```sql
-- Study sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  file_id UUID NOT NULL REFERENCES course_files(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER, -- seconds
  progress JSONB, -- detailed progress data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  file_id UUID NOT NULL REFERENCES course_files(id),
  chunk_id UUID REFERENCES file_chunks(id),
  text TEXT NOT NULL,
  note TEXT,
  color VARCHAR(7) DEFAULT '#FFFF00',
  position JSONB NOT NULL, -- {page, x, y, width, height}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Study progress
CREATE TABLE study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  file_id UUID NOT NULL REFERENCES course_files(id),
  completed_chunks UUID[],
  total_time INTEGER DEFAULT 0,
  last_position JSONB,
  stats JSONB, -- questions, flashcards, etc
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);
```

## Component Structure

```
frontend/src/
├── app/(dashboard)/courses/[id]/study/[fileId]/
│   └── page.tsx
├── components/study/
│   ├── StudyLayout.tsx
│   ├── ContentViewer.tsx
│   ├── PersonalizedPanel.tsx
│   ├── OutlineGenerator.tsx
│   ├── AnnotationLayer.tsx
│   ├── NotesPanel.tsx
│   ├── StudyChat.tsx
│   ├── FlashcardMode.tsx
│   ├── QuizMode.tsx
│   ├── StudyStats.tsx
│   └── ExportModal.tsx
├── hooks/
│   ├── useContentStream.ts
│   ├── useSyncedScrolling.ts
│   ├── useContextualChat.ts
│   ├── useStudySession.ts
│   └── useAnnotations.ts
└── lib/api/
    └── study.ts
```

## Success Metrics

### Technical
- First content load < 2s
- Streaming latency < 500ms
- Smooth scrolling (60 fps)
- Mobile responsive

### User Experience
- Seamless content switching
- Intuitive navigation
- Clear visual hierarchy
- Helpful AI responses

### Learning Outcomes
- Increased engagement time
- Higher quiz scores
- More notes created
- Better retention rates

## Dependencies

### NPM Packages
```json
{
  "react-resizable-panels": "^2.0.0",
  "react-pdf": "^7.5.0",
  "@tiptap/react": "^2.1.0",
  "react-intersection-observer": "^9.5.0",
  "framer-motion": "^10.16.0",
  "react-hotkeys-hook": "^4.4.0",
  "html2canvas": "^1.4.0",
  "jspdf": "^2.5.0"
}
```

## Risk Mitigation

1. **Performance**: Virtualize long documents
2. **Mobile**: Progressive enhancement
3. **Offline**: Cache critical data
4. **Errors**: Graceful fallbacks

## Next Steps

After Phase 6 completion:
1. Advanced analytics (Phase 7)
2. Collaborative features
3. Gamification elements
4. AI tutoring enhancements