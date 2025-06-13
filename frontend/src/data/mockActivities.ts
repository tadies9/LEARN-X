export const MOCK_ACTIVITIES = [
  {
    id: '1',
    type: 'complete' as const,
    title: 'Completed Module 3',
    description: 'Introduction to React Hooks',
    time: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    type: 'achievement' as const,
    title: 'Achievement Unlocked',
    description: '7-day learning streak!',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    type: 'course' as const,
    title: 'Started New Course',
    description: 'Advanced TypeScript Patterns',
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '4',
    type: 'goal' as const,
    title: 'Weekly Goal Achieved',
    description: 'Completed 5 hours of study',
    time: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];