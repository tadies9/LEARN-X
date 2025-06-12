import { LearningLayout } from '@/components/layouts/learning-layout';

// Mock data - in real app, fetch from database
const mockModules = [
  {
    id: '1',
    title: 'Introduction to React',
    duration: '2h',
    status: 'completed' as const,
    lessons: [
      { id: '1-1', title: 'What is React?', completed: true },
      { id: '1-2', title: 'Setting up your environment', completed: true },
      { id: '1-3', title: 'Your first component', completed: true },
    ],
  },
  {
    id: '2',
    title: 'React Hooks',
    duration: '3h',
    status: 'in-progress' as const,
    lessons: [
      { id: '2-1', title: 'useState Hook', completed: true },
      { id: '2-2', title: 'useEffect Hook', completed: true },
      { id: '2-3', title: 'Custom Hooks', completed: false },
    ],
  },
  {
    id: '3',
    title: 'Advanced Patterns',
    duration: '4h',
    status: 'locked' as const,
    lessons: [
      { id: '3-1', title: 'Render Props', completed: false },
      { id: '3-2', title: 'Higher Order Components', completed: false },
      { id: '3-3', title: 'Context API', completed: false },
    ],
  },
];

export default function LearnPage({ params }: { params: { id: string } }) {
  // In a real app, fetch course data based on params.id
  const courseId = params.id;
  const courseTitle = 'Advanced React Development';

  // Using a sample PDF for demonstration
  const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  return (
    <LearningLayout
      courseId={courseId}
      courseTitle={courseTitle}
      pdfUrl={pdfUrl}
      modules={mockModules}
    />
  );
}
