export const overallGrades = {
  gpa: 3.7,
  totalAssignments: 24,
  completedAssignments: 20,
  averageScore: 87,
  improvement: 12, // percentage improvement over time
};

export const courseGrades = [
  {
    id: 1,
    course: 'JavaScript Fundamentals',
    grade: 'A-',
    percentage: 92,
    assignments: 8,
    completed: 8,
    lastActivity: '2024-12-10',
    color: 'bg-green-500',
  },
  {
    id: 2,
    course: 'React Development',
    grade: 'B+',
    percentage: 87,
    assignments: 6,
    completed: 5,
    lastActivity: '2024-12-12',
    color: 'bg-blue-500',
  },
  {
    id: 3,
    course: 'Database Design',
    grade: 'A',
    percentage: 94,
    assignments: 5,
    completed: 5,
    lastActivity: '2024-12-11',
    color: 'bg-purple-500',
  },
  {
    id: 4,
    course: 'UI/UX Design',
    grade: 'B',
    percentage: 83,
    assignments: 5,
    completed: 2,
    lastActivity: '2024-12-08',
    color: 'bg-orange-500',
  },
];

export const recentSubmissions = [
  {
    id: 1,
    assignment: 'React Component Library',
    course: 'React Development',
    submitted: '2024-12-12',
    grade: 89,
    maxScore: 100,
    status: 'graded' as const,
    feedback: 'Excellent work on component structure and reusability. Consider adding more comprehensive unit tests.',
  },
  {
    id: 2,
    assignment: 'Database Normalization Exercise',
    course: 'Database Design',
    submitted: '2024-12-11',
    grade: 96,
    maxScore: 100,
    status: 'graded' as const,
    feedback: 'Perfect understanding of normalization principles. Great documentation.',
  },
  {
    id: 3,
    assignment: 'User Research Report',
    course: 'UI/UX Design',
    submitted: '2024-12-10',
    maxScore: 100,
    status: 'pending' as const,
  },
  {
    id: 4,
    assignment: 'JavaScript Array Methods',
    course: 'JavaScript Fundamentals',
    submitted: '2024-12-09',
    grade: 92,
    maxScore: 100,
    status: 'graded' as const,
    feedback: 'Good implementation. Try to use more modern ES6+ features.',
  },
];

export const performanceData = [
  { month: 'Sep', score: 78 },
  { month: 'Oct', score: 82 },
  { month: 'Nov', score: 85 },
  { month: 'Dec', score: 87 },
];