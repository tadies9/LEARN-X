'use client';

import { Button } from '@/components/ui/button';

export function GetStartedBanner() {
  return (
    <section className="w-full py-12 md:py-16 bg-primary/5 dark:bg-[#0A1628]">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">
            Ready to transform your learning?
          </h2>
          <p className="max-w-[600px] text-muted-foreground md:text-lg">
            Join students who are already learning smarter, not harder.
          </p>
          <Button size="lg" className="mt-4" onClick={() => (window.location.href = '/register')}>
            Get Started Free
          </Button>
          <p className="text-sm text-muted-foreground">
            No credit card required • Free during beta
          </p>
        </div>
      </div>
    </section>
  );
}
