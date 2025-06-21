import { Book, BarChart3, Shield, Users, Zap, Database } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

export function FeaturesGrid() {
  return (
    <section className="w-full py-12 md:py-24 bg-gray-100 dark:bg-[#0A1628]">
      <div className="container px-4 md:px-6">
        <FeaturesHeader />
        <div className="grid gap-6 mt-12 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesHeader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="inline-block rounded-lg bg-primary/15 dark:bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
        FEATURES
      </div>
      <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-gray-900 dark:text-white">
        Everything You Need to Learn Better
      </h2>
      <p className="max-w-[700px] text-muted-foreground md:text-lg">
        Our comprehensive suite of tools transforms how you learn, making complex concepts
        accessible and engaging.
      </p>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="border-2 border-gray-300 dark:border-gray-800 bg-white dark:bg-card/50 shadow-lg transition-all hover:shadow-xl hover:border-gray-400 dark:hover:border-gray-700">
      <CardContent className="p-6">
        <div className="flex flex-col items-start space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/20">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const features = [
  {
    icon: <Book className="h-5 w-5 text-primary" />,
    title: 'Instant Course Import',
    description:
      'Upload your Canvas materials in seconds. Start learning immediately with AI-powered explanations.',
  },
  {
    icon: <Zap className="h-5 w-5 text-primary" />,
    title: 'Adaptive Learning',
    description:
      'Quizzes that adjust to your level, focusing on areas where you need the most help.',
  },
  {
    icon: <Shield className="h-5 w-5 text-primary" />,
    title: "Learn, Don't Cheat",
    description:
      'Get genuine understanding with AI that guides you to answers instead of just giving them away.',
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    title: 'Track Your Progress',
    description:
      'See your improvement over time with detailed insights into your learning journey.',
  },
  {
    icon: <Users className="h-5 w-5 text-primary" />,
    title: 'Personalized for You',
    description:
      'AI adapts to your learning style, pace, and interests to create the perfect study experience.',
  },
  {
    icon: <Database className="h-5 w-5 text-primary" />,
    title: 'Study Anywhere',
    description:
      'Access your materials from any device, anytime. Your learning follows you everywhere.',
  },
];
