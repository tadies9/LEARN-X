# Dashboard Implementation Plan

## Overview
This document outlines the comprehensive plan to make the LEARN-X dashboard fully functional, with special consideration for new users vs users with existing courses.

## Current State Analysis

### Working Components
- ✅ Course fetching and display
- ✅ Personalized greetings based on persona
- ✅ AI recommendations engine
- ✅ Basic course statistics
- ✅ Empty states for new users

### Placeholder Components
- ❌ Study time tracking (hardcoded)
- ❌ Learning streak (hardcoded)
- ❌ Progress tracking (always 0%)
- ❌ Activity timeline (mock data)
- ❌ Course completion metrics

## Implementation Strategy

### Phase 1: Backend Infrastructure (Priority: HIGH)

#### 1.1 Dashboard Statistics API
Create `/api/v1/dashboard/stats` endpoint that returns:
```typescript
interface DashboardStats {
  studyTime: {
    today: number; // minutes
    thisWeek: number;
    total: number;
  };
  streak: {
    current: number; // days
    longest: number;
    lastActiveDate: string;
  };
  courses: {
    active: number;
    completed: number;
    archived: number;
    totalModules: number;
    completedModules: number;
  };
  progress: {
    overallCompletion: number; // percentage
    weeklyGoalProgress: number;
    masteredConcepts: number;
  };
}
```

#### 1.2 Activity Tracking System
Create activity logging service:
```typescript
interface Activity {
  id: string;
  userId: string;
  type: 'course_created' | 'module_completed' | 'file_uploaded' | 'study_session' | 'achievement_earned';
  metadata: Record<string, any>;
  timestamp: Date;
}
```

#### 1.3 Progress Tracking Service
Implement real-time progress tracking:
- Track file/chunk completion
- Calculate module progress
- Update course completion percentage
- Store last accessed position

### Phase 2: New User Experience (Priority: HIGH)

#### 2.1 Enhanced Empty State
For users with no courses:
```typescript
interface NewUserDashboard {
  welcomeCard: {
    personalized: boolean;
    suggestedActions: Action[];
    onboardingProgress: number;
  };
  guidedTour: {
    steps: TourStep[];
    currentStep: number;
  };
  quickStart: {
    templates: CourseTemplate[];
    recommendations: Course[];
  };
}
```

#### 2.2 Progressive Disclosure
- Show simplified dashboard for new users
- Gradually introduce features as they progress
- Highlight key actions (Create Course, Upload Materials)

### Phase 3: Existing User Enhancements (Priority: MEDIUM)

#### 3.1 Dynamic Course Cards
Replace static course cards with:
- Real progress percentage
- Next lesson to continue
- Time since last activity
- Estimated time to complete

#### 3.2 Smart Recommendations
Enhance AI recommendations with:
- Based on learning patterns
- Time of day preferences
- Difficulty progression
- Topic diversity

### Phase 4: Real-time Features (Priority: MEDIUM)

#### 4.1 Study Session Tracking
```typescript
interface StudySession {
  startTime: Date;
  endTime?: Date;
  fileId: string;
  chunksViewed: string[];
  questionsAsked: number;
  notesCreated: number;
}
```

#### 4.2 Learning Streak Calculation
- Check daily activity
- Award streak badges
- Send reminder notifications
- Handle timezone considerations

### Phase 5: Activity Timeline (Priority: LOW)

Replace mock activities with real events:
- Course creation
- Module completion
- Achievement unlocks
- Study milestones
- AI interactions

## Database Schema Updates

### New Tables/Updates Needed:
1. `user_stats` - Aggregate statistics cache
2. `activity_log` - User activity tracking
3. Update `study_sessions` - Add streak tracking
4. Update `courses` - Add completion tracking

## Frontend Components Updates

### 1. DashboardStats Component
```typescript
// Replace hardcoded values with:
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => dashboardApi.getStats(),
  refetchInterval: 60000, // Refresh every minute
});
```

### 2. CourseCard Component
```typescript
// Add progress tracking:
interface CourseCardProps {
  course: Course;
  progress: CourseProgress;
  nextLesson?: Lesson;
  lastAccessed?: Date;
}
```

### 3. ActivityTimeline Component
```typescript
// Replace mock data with:
const { data: activities } = useQuery({
  queryKey: ['user-activities'],
  queryFn: () => activityApi.getRecent(10),
});
```

## Implementation Timeline

### Week 1: Backend Foundation
- [ ] Create dashboard stats API endpoints
- [ ] Implement progress tracking service
- [ ] Set up activity logging system
- [ ] Create database migrations

### Week 2: Frontend Integration
- [ ] Update dashboard components to use real data
- [ ] Implement real-time updates
- [ ] Add loading states and error handling
- [ ] Create new user guided experience

### Week 3: Polish & Testing
- [ ] Add animations and transitions
- [ ] Implement caching strategies
- [ ] Write comprehensive tests
- [ ] Performance optimization

## Success Metrics

1. **New User Activation**: 80% create first course within 7 days
2. **Engagement**: Daily active users increase by 40%
3. **Performance**: Dashboard loads in <1 second
4. **Accuracy**: Real-time stats update within 5 seconds

## Technical Considerations

1. **Caching**: Use Redis for frequently accessed stats
2. **Real-time**: Consider WebSockets for live updates
3. **Performance**: Aggregate stats in background jobs
4. **Scalability**: Design for 10,000+ concurrent users

## Migration Strategy

1. Deploy backend changes first
2. Feature flag new dashboard components
3. Gradually roll out to user segments
4. Monitor performance and errors
5. Full rollout after stability confirmed