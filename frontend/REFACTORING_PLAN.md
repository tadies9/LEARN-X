# Component Refactoring Plan

## Completed ✅
1. **QuizPractice.tsx** (469 lines → modular components)
   - Split into 9 focused components under `/src/components/study/quiz/`
   - Each component now has single responsibility
   - Types and utils extracted to separate files

2. **UnifiedHeroSection.tsx** (456 lines → modular components)
   - Split into 7 focused components under `/src/components/sections/hero/`
   - Styles and types extracted
   - Better separation of concerns

## Components Requiring Refactoring (300+ lines)

### High Priority (400+ lines)
1. **StudyTimer.tsx** (423 lines)
   - Extract timer logic into custom hook
   - Split UI components (TimerDisplay, TimerControls, SessionStats)
   - Create separate components for different timer modes

2. **AnnotationLayer.tsx** (413 lines)
   - Extract annotation types and interfaces
   - Create separate components for different annotation tools
   - Split annotation rendering and editing logic

### Medium Priority (350-400 lines)
3. **InterestsStep.tsx** (380 lines)
   - Extract interest categories data
   - Create InterestCard component
   - Separate search/filter logic

4. **StudyLayout.tsx** (367 lines)
   - Split into smaller layout components
   - Extract sidebar and main content areas
   - Create separate components for study modes

5. **ModuleCard.tsx** (364 lines)
   - Extract file management logic
   - Create separate components for card sections
   - Split drag-and-drop functionality

### Lower Priority (300-350 lines)
6. **MermaidRenderer.tsx** (347 lines)
   - Already has dynamic import wrapper
   - Could extract diagram types handlers
   - Separate error handling component

7. **ai-tutor/page.tsx** (347 lines)
   - Extract chat interface components
   - Separate AI interaction logic
   - Create message components

8. **FlashcardPractice.tsx** (346 lines)
   - Similar pattern to QuizPractice refactor
   - Extract card display components
   - Separate progress tracking

## Refactoring Guidelines

1. **Component Size**: Target 150-200 lines max per component
2. **Single Responsibility**: Each component should do one thing well
3. **Reusability**: Extract common patterns into shared components
4. **Type Safety**: Extract interfaces to separate type files
5. **Custom Hooks**: Extract complex logic into custom hooks
6. **Utils**: Move pure functions to utility files

## Next Steps

1. Start with StudyTimer.tsx as it's the largest remaining component
2. Apply similar patterns used in QuizPractice refactoring
3. Ensure all refactored components maintain existing functionality
4. Update imports in components that use the refactored ones