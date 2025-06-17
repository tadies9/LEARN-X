import { Button } from "@/components/ui/button";

export function CTAFinal() {
  return (
    <section className="w-full py-12 md:py-24 bg-gradient-to-b from-gray-50 to-gray-100 dark:bg-[#0A1628]">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-gray-900 dark:text-white">
            Ready to transform your learning?
          </h2>
          <p className="max-w-[700px] text-gray-600 dark:text-gray-400 md:text-lg">
            Start your personalized learning journey today.
          </p>
          <div className="mt-6">
            <Button
              size="lg"
            >
              Start Learning Free
            </Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            No credit card required. Start learning in seconds.
          </p>
        </div>
      </div>
    </section>
  );
}