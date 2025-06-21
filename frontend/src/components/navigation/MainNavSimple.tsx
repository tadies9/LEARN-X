'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/navigation/ThemeToggle';

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center">
        <Logo showText={false} width={60} height={60} />

        <nav className="hidden md:flex items-center gap-6 mx-6">
          <Link
            href="/features"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === '/features' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Features
          </Link>
          <Link
            href="/customers"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === '/customers' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Customers
          </Link>
          <Link
            href="/pricing"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === '/pricing' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Pricing
          </Link>
          <Link
            href="/resources"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === '/resources' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Resources
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/demo">
            <Button>Book Demo</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
