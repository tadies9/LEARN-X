import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">LEARN-X</div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">Your AI Learning Companion</h1>
        <h2 className="text-2xl md:text-3xl text-muted-foreground mb-8">
          Learn YOUR Way - Content That Speaks Your Language
        </h2>

        <div className="max-w-3xl mx-auto bg-card border rounded-lg p-8 mb-8">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold mb-4">AI that adapts to YOU - not the other way</h3>
          <p className="text-lg text-muted-foreground mb-6">
            Upload any PDF → Get personalized explanations
            <br />
            using YOUR interests, YOUR style, YOUR pace
          </p>
          <Link href="/register">
            <Button size="lg" className="font-semibold">
              Start Learning Free →
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-card border rounded-lg p-6">
            <div className="text-3xl mb-4">👁️</div>
            <h3 className="text-xl font-semibold mb-2">Visual Learning</h3>
            <p className="text-muted-foreground">
              See concepts through YOUR lens - whether you're into sports, cooking, or gaming
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Personalized Examples</h3>
            <p className="text-muted-foreground">
              Basketball fan? Learn recursion with hoops. Chef? Understand databases through recipes
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Instant Understanding</h3>
            <p className="text-muted-foreground">
              Complex ideas explained in YOUR language - skip the jargon, get the concept
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20">
          <h3 className="text-2xl font-semibold mb-6">Ready to transform how you learn?</h3>
          <Link href="/register">
            <Button size="lg" className="font-semibold">
              Start Your Free Account →
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 5 free documents per month
          </p>
        </div>
      </section>
    </div>
  );
}
