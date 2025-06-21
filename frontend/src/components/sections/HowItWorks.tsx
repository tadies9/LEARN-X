import Image from 'next/image';

import { CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export function HowItWorks() {
  return (
    <section className="w-full py-12 md:py-24 bg-background dark:bg-[#0A1628]">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          <HowItWorksContent />
          <HowItWorksImage />
        </div>
      </div>
    </section>
  );
}

function HowItWorksContent() {
  return (
    <div className="flex flex-col justify-center space-y-4">
      <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary w-fit">
        HOW IT WORKS
      </div>
      <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
        Your Students' Personalized Learning Journey
      </h2>
      <p className="text-muted-foreground md:text-lg">
        Learn-X transforms existing Canvas materials into engaging, personalized learning pathways
        tailored to each student's style, pace, and goals.
      </p>
      <ul className="space-y-4 mt-6">
        {steps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <CheckCircle className="h-6 w-6 text-primary mt-0.5" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Button>Learn More</Button>
      </div>
    </div>
  );
}

function HowItWorksImage() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-lg">
        <Image
          src="/images/dashboard-screenshot.png"
          alt="Learn-X Dashboard"
          width={600}
          height={400}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

const steps = [
  'Instant syllabus generation from any Canvas materials',
  'Smart quizzes that adapt to individual learning pace',
  'Detailed progress tracking and performance insights',
  'Ethical AI that supports learning, not shortcuts',
];
