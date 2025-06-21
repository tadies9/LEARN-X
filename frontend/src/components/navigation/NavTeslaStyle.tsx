'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function NavTeslaStyle() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo showText={true} width={32} height={32} />
          </Link>

          {/* Resources link - no demo duplication */}
          <Link
            href="/resources"
            className="hidden md:inline-block text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors duration-200"
          >
            Resources
          </Link>
        </div>
      </div>
    </header>
  );
}
