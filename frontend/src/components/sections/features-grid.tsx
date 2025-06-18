import { Card, CardContent } from '@/components/ui/card';
import { Book, BarChart3, Shield, Users, Zap, Database } from 'lucide-react';

export function FeaturesGrid() {
  return (
    <section className="w-full py-12 md:py-24 bg-gray-50">
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
      <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-600">
        FEATURES
      </div>
      <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
        Revolutionize Your Students' Learning
      </h2>
      <p className="max-w-[700px] text-muted-foreground md:text-lg">
        Our comprehensive suite of tools transforms how your students learn, making complex concepts
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
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col items-start space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            {icon}
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const features = [
  {
    icon: <Book className="h-5 w-5 text-blue-600" />,
    title: 'Canvas One-Click Upload',
    description:
      'Import your existing Canvas materials in seconds. No reformatting or rebuilding required.',
  },
  {
    icon: <Zap className="h-5 w-5 text-blue-600" />,
    title: 'Adaptive Assessments',
    description:
      'Quizzes that automatically adjust difficulty based on student performance, focusing on areas needing improvement.',
  },
  {
    icon: <Shield className="h-5 w-5 text-blue-600" />,
    title: 'Integrity Guard',
    description:
      'Advanced AI that blocks answer-dump prompts while still providing helpful guidance and learning support.',
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
    title: 'Actionable Analytics',
    description:
      'Identify knowledge gaps and struggling students with real-time insights and customizable reports.',
  },
  {
    icon: <Users className="h-5 w-5 text-blue-600" />,
    title: 'AI-Powered Personalization',
    description:
      "Automatically creates customized learning paths based on each student's strengths, weaknesses, and pace.",
  },
  {
    icon: <Database className="h-5 w-5 text-blue-600" />,
    title: 'Cloud-Based Access',
    description:
      'Secure, FERPA-compliant cloud storage ensures materials are accessible from any device, anywhere.',
  },
];
