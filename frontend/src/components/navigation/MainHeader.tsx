import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function MainHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/learn-x-logo.png"
            alt="Learn-X Logo"
            width={130}
            height={50}
            className="h-auto"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/features"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Features
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            How It Works
          </Link>
          <Link
            href="/for-educators"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            For Educators
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium transition-colors hover:text-primary hidden sm:block"
          >
            Log In
          </Link>
          <Button
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            Book a Demo
          </Button>
        </div>
      </div>
    </header>
  );
}