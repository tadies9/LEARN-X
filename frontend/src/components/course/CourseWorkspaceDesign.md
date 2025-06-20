# Course Workspace Design - Streamlined Personalization

## Current Flow (TOO MANY CLICKS)

Dashboard → Course → Module → File → Star → Personalize Page = 6 interactions

## New Flow (2 CLICKS MAX)

Dashboard → Course → [Everything visible, inline actions]

## Component Structure

```
┌────────────────────────────────────────────────────────────┐
│  Course: Introduction to Economics                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─── Left Rail ───┐  ┌─────── Main Content ──────────┐  │
│  │                 │  │                                │  │
│  │ ▼ Module 1      │  │ □ Week-1-Lecture.pdf          │  │
│  │   ▶ Week 1      │  │   ⚡ Flashcards | ✂️ Summary  │  │
│  │   ▶ Week 2      │  │                                │  │
│  │                 │  │ □ Week-1-Slides.pptx          │  │
│  │ ▼ Module 2      │  │   ⚡ Flashcards | ✂️ Summary  │  │
│  │   ▶ Week 3      │  │                                │  │
│  │   ▶ Week 4      │  │ □ Chapter-1-Reading.pdf       │  │
│  │                 │  │   ⚡ Flashcards | ✂️ Summary  │  │
│  └─────────────────┘  └────────────────────────────────┘  │
│                                                            │
│  ┌─────────── Sticky Bottom Bar (appears on selection) ───┐│
│  │  3 files selected | Generate Study Pack 📚             ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘

                        ┌─── Right Drawer ───┐
                        │                    │
                        │ 📚 Study Materials  │
                        │                    │
                        │ Generating...      │
                        │ [spinner]          │
                        │                    │
                        │ --- Results ---    │
                        │ • Flashcards (12)  │
                        │ • Summary          │
                        │ • Quiz (5 Qs)     │
                        └────────────────────┘
```

## Key Features

### 1. File Row Actions (Hover State)

- ⚡ **Flashcards** - Generate flashcards for this file
- ✂️ **Summary** - Create AI summary
- ⋯ **More** - Additional options (quiz, outline, etc.)

### 2. Bulk Selection

- Checkbox on each file
- Bottom bar appears when 1+ files selected
- "Generate Study Pack" processes all selected files

### 3. Right-Side Drawer

- Opens inline (no page navigation)
- Shows real-time progress
- Results stream in as they complete
- Stays open for multiple actions

### 4. Progressive Disclosure

- Show top 2 actions upfront (Flashcards, Summary)
- Hide less common actions under "More"
- Keep UI clean and focused

## Technical Implementation

### Frontend Components Needed:

1. `CourseWorkspace.tsx` - Main container
2. `FileRow.tsx` - Individual file with hover actions
3. `StudyDrawer.tsx` - Right-side panel for results
4. `BulkActionBar.tsx` - Bottom sticky bar

### API Endpoints:

```typescript
POST /api/generate
{
  file_ids: string[],
  output_types: ['flashcards', 'summary', 'quiz'],
  course_id: string,
  user_id: string
}
```

### Real-time Updates:

- Use Supabase Realtime channels
- Channel: `personalization:${user_id}`
- Events: `job.started`, `job.progress`, `job.completed`

## User Journey

1. Student opens course → sees all files immediately
2. Hovers over file → action buttons appear
3. Clicks "⚡ Flashcards" → drawer slides in from right
4. Sees spinner → flashcards appear in ~10 seconds
5. Can continue clicking other files → results stack in drawer

OR (Bulk flow):

1. Student checks 3-5 files for upcoming exam
2. Bottom bar appears: "Generate Study Pack"
3. One click → all materials generated together
4. Results appear in drawer as they complete

## Success Metrics

- Time to first flashcard: < 10 seconds
- Clicks from course open to content: ≤ 2
- Student satisfaction: > 80%
- Completion rate: > 90% (vs current ~40%)
