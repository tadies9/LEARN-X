import { Card, CardContent } from '@/components/ui/card';
import { Book, Shield } from 'lucide-react';

export function ForEducators() {
  return (
    <section className="w-full py-12 md:py-24 bg-gray-50">
      <div className="container px-4 md:px-6">
        <ForEducatorsHeader />
        <div className="grid gap-6 mt-12 md:grid-cols-2">
          {educatorFeatures.map((feature) => (
            <EducatorFeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ForEducatorsHeader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-600">
        FOR EDUCATORS
      </div>
      <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
        Help Your Students Learn Their Own Way
      </h2>
      <p className="max-w-[700px] text-muted-foreground md:text-lg">
        Learn-X equips students with practical skills for the modern world while giving you powerful
        tools to enhance your teaching.
      </p>
    </div>
  );
}

interface EducatorFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EducatorFeatureCard({ icon, title, description }: EducatorFeatureCardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-muted-foreground mt-2">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const educatorFeatures = [
  {
    icon: <Book className="h-5 w-5 text-blue-600" />,
    title: 'Canvas Compatibility',
    description:
      'Works seamlessly with Canvas. With just a few steps, your class materials can be uploaded to Learn-X AI.',
  },
  {
    icon: <Shield className="h-5 w-5 text-blue-600" />,
    title: 'Integrity Guard',
    description:
      'Our AI engine prevents students from getting answers to homework and quiz questions while still providing helpful guidance.',
  },
];
