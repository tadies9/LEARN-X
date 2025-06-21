'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function FooterTeslaStyle() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Logo & Description */}
          <div className="flex flex-col items-start">
            <Logo showText={true} width={32} height={32} />
            <p className="text-sm text-[#86868b] mt-4 max-w-xs">
              Transforming education with AI-powered personalized learning experiences.
            </p>
          </div>

          {/* Minimal Links - Mirror top nav */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <Link
              href="/demo"
              className="text-[#86868b] hover:text-[#1d1d1f] transition-colors duration-200"
            >
              Demo
            </Link>
            <Link
              href="/privacy"
              className="text-[#86868b] hover:text-[#1d1d1f] transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[#86868b] hover:text-[#1d1d1f] transition-colors duration-200"
            >
              Terms
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs text-[#86868b] text-center">
            © 2025 LEARN-X Learning, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
