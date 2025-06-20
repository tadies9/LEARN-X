# Course Workspace Integration Guide

## Overview

The new CourseWorkspace component provides a streamlined, single-screen interface for course content with inline personalization. This replaces the 6-click flow with a maximum 2-click experience.

## Key Components

### 1. CourseWorkspace

Main container that handles file selection, actions, and drawer state.

### 2. StudyDrawer

Right-side panel that shows generated content (flashcards, summaries, etc.)

### 3. BulkActionBar

Sticky bottom bar for bulk operations on selected files.

## Integration Steps

### Option 1: Replace Existing Course Page

1. Navigate to `/courses/[id]/workspace` to see the new interface
2. Update navigation to point to workspace instead of the old course page

### Option 2: Add as Alternative View

1. Add a toggle button in the course header:

```tsx
<Button onClick={() => router.push(`/courses/${courseId}/workspace`)}>Try New Workspace</Button>
```

### Option 3: Progressive Migration

1. Start with specific courses or user groups
2. Use feature flags to control access
3. Gather feedback before full rollout

## Backend Requirements

1. **Database Tables**: Run the migration in `/backend/migrations/create_generation_tables.sql`

2. **API Endpoints**: The `/api/generate` endpoint is already created and handles:

   - Single file generation
   - Bulk generation for multiple files
   - Job status tracking
   - Generation history

3. **Python AI Service Integration**:
   - The FileProcessingQueue now supports `generate_content` job type
   - Python service needs to handle this job type and return results

## Usage Example

```tsx
// Single file action
handleFileAction(file, 'flashcards');
// Generates flashcards for one file

// Bulk action
handleBulkGenerate();
// Generates study pack (flashcards + summaries) for all selected files
```

## Next Steps

1. **Implement Supabase Realtime** for live job updates
2. **Add optimistic UI** with placeholder cards
3. **Remove old personalize page** after testing
4. **Add more content types**: quiz, outline, mind maps
5. **Implement user preferences** for default actions

## Testing Checklist

- [ ] File hover shows action buttons
- [ ] Clicking action opens drawer immediately
- [ ] Drawer shows loading state
- [ ] Results appear in drawer when ready
- [ ] Multiple files can be selected
- [ ] Bulk action bar appears/disappears correctly
- [ ] Study pack generates for all selected files
- [ ] Results can be copied/downloaded
- [ ] Drawer can be closed and reopened

## Performance Metrics to Track

1. **Time to First Flashcard**: Target < 10 seconds
2. **Clicks from Course to Content**: Target ≤ 2
3. **Completion Rate**: Target > 90%
4. **User Satisfaction**: Target > 80%
