# Explain Integration Plan for CourseWorkspace

## The Vision

The CourseWorkspace should be the ONE place where students interact with their content. It should support both:

1. **Deep Learning** - Understanding concepts through personalized explanations
2. **Study Prep** - Creating flashcards, summaries, and study materials

## Proposed UI Design

### File Row Design (Enhanced)

```
┌─────────────────────────────────────────────────────────┐
│ □ 📄 Week-1-Lecture.pdf                                 │
│     Module 1 • 15 pages • Uploaded 2 days ago          │
│                                                         │
│     [📖 Explain] ⚡ Flashcards | ✂️ Summary | ⋯ More   │
└─────────────────────────────────────────────────────────┘
```

### Key Changes:

1. **Primary Action**: "Explain" button is more prominent
2. **Secondary Actions**: Study tools remain but smaller
3. **File Metadata**: Show more context about the file

## Right Drawer Modes

### Mode 1: Explain View (Primary)

```
┌─── Right Drawer (Explain Mode) ───┐
│                                   │
│ 📖 Understanding: Week-1-Lecture  │
│                                   │
│ [Streaming personalized content]  │
│                                   │
│ Hey [Name], let me explain this   │
│ economic concept using something  │
│ you're familiar with...           │
│                                   │
│ Think of supply and demand like   │
│ your favorite basketball team's   │
│ ticket prices...                  │
│                                   │
│ [Continue streaming...]           │
│                                   │
│ ─────────────────────────────     │
│                                   │
│ 💬 Ask a follow-up question:      │
│ [___________________________]     │
│                                   │
│ Suggested questions:              │
│ • How does this apply to crypto?  │
│ • Can you give another example?   │
│                                   │
└───────────────────────────────────┘
```

### Mode 2: Study Tools View (Current)

```
┌─── Right Drawer (Study Mode) ───┐
│                                 │
│ 📚 Study Materials              │
│                                 │
│ [Tabs: Flashcards | Summaries]  │
│                                 │
│ [Current implementation...]      │
│                                 │
└─────────────────────────────────┘
```

## Technical Implementation

### 1. File Row Actions Update

```typescript
// Primary action - more prominent
<Button
  variant="default"
  size="sm"
  onClick={() => handleExplainFile(file)}
  className="mr-3"
>
  📖 Explain
</Button>

// Secondary actions - smaller, grouped
<div className="flex items-center gap-1 text-xs">
  <Button variant="ghost" size="sm">⚡ Flashcards</Button>
  <span>|</span>
  <Button variant="ghost" size="sm">✂️ Summary</Button>
  <span>|</span>
  <Button variant="ghost" size="sm">⋯</Button>
</div>
```

### 2. Drawer Content Switch

```typescript
const StudyDrawer = ({ mode, ...props }) => {
  if (mode === 'explain') {
    return <ExplainView {...props} />;
  }

  return <StudyToolsView {...props} />;
};
```

### 3. Explain API Integration

Use existing explain endpoint but in the new UI:

- `/api/v1/learn/explain/stream`
- Stream responses for better UX
- Show persona-based analogies
- Enable follow-up questions

## User Flows

### Flow 1: Learning (Primary)

1. Student opens course → sees all files
2. Clicks "📖 Explain" on a file
3. Drawer opens with streaming explanation
4. Can ask follow-up questions
5. Can switch to study tools if needed

### Flow 2: Study Prep

1. Student selects multiple files
2. Bottom bar: "Generate Study Pack"
3. Creates flashcards + summaries
4. Views in tabbed interface

### Flow 3: Quick Reference

1. Student clicks file title (not button)
2. Opens file preview/viewer
3. Can annotate or highlight

## Benefits of This Approach

1. **Preserves Explain's Power**: The rich, personalized explanations aren't buried
2. **Maintains Efficiency**: Still 2 clicks to any content
3. **Clear Mental Model**: Learning vs. Studying are distinct but accessible
4. **Progressive Disclosure**: Can add more features without cluttering

## Migration Path

1. Add Explain button to file rows
2. Create ExplainView component for drawer
3. Integrate with existing explain API
4. Add mode switching to drawer
5. Test with users
6. Deprecate old learn page

## Success Metrics

- Time to first explanation: < 5 seconds
- Engagement with explanations vs. study tools
- Follow-up question rate
- User satisfaction scores
