import { Button } from '@/components/ui/button';

export function CTAFinal() {
  return (
    <section className="w-full py-12 md:py-24 bg-blue-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
            Ready to transform your students' education?
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Join educators already teaching with personalized AI learning.
          </p>
          <div className="mt-6">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-base">
              Book a 15-min Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            FERPA-compliant. No credit card required for trial.
          </p>
        </div>
      </div>
    </section>
  );
}
