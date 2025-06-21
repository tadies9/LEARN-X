'use client';

import { Button } from '@/components/ui/Button';

export function CTAFinal() {
  return (
    <section className="w-full py-12 md:py-24 bg-gray-50 dark:bg-[#0A1628]">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
            Ready to transform your learning?
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Start your personalized learning journey today.
          </p>
          <div className="mt-6">
            <Button size="lg" onClick={() => (window.location.href = '/register')}>
              Start Learning Free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
