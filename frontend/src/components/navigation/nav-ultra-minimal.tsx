'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function NavUltraMinimal() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Logo showText={false} width={40} height={40} />

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/features"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/resources"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Resources
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
