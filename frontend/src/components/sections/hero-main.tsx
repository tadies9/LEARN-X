import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function HeroMain() {
  return (
    <section className="relative w-full py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <HeroContent />
          <HeroImage />
        </div>
      </div>
    </section>
  );
}

function HeroContent() {
  return (
    <div className="flex flex-col justify-center space-y-4">
      <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-600 w-fit">
        AI-POWERED EDUCATION PLATFORM
      </div>
      <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-blue-600">
        Give every student a personal AI tutor in &lt;60 sec
      </h1>
      <p className="text-lg text-muted-foreground md:text-xl max-w-[600px]">
        Transform your Canvas materials into personalized learning pathways. Educators report 32%
        higher engagement and 28% improved test scores.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-base">
          Book a 15-min Demo
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        FERPA-compliant. No credit card required for trial.
      </p>
    </div>
  );
}

function HeroImage() {
  return (
    <div className="flex items-center justify-center lg:justify-end">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <Image
          src="/images/dashboard-screenshot.png"
          alt="Learn-X Dashboard showing Canvas material being transformed into personalized learning content"
          width={600}
          height={400}
          className="w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}
