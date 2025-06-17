import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";

export function MainHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-black dark:bg-slate-900 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logoo.svg"
            alt="LEARN-X Logo"
            width={120}
            height={40}
            className="h-auto w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-white transition-colors hover:text-blue-400 hidden sm:block"
          >
            Log In
          </Link>
          <Button
            variant="default"
          >
            Book a Demo
          </Button>
        </div>
      </div>
    </header>
  );
}