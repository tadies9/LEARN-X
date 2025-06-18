'use client';

import Image from 'next/image';
import { OnboardingProvider } from '@/contexts/onboarding-context';

import { OnboardingWizard } from './components/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex flex-col">
        {/* Simple header with logo */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="container flex h-16 items-center">
            <Image
              src="/images/logoo.svg"
              alt="LEARN-X Logo"
              width={120}
              height={40}
              className="h-auto w-auto"
              priority
            />
          </div>
        </header>

        {/* Main onboarding content */}
        <main className="flex-1 overflow-auto">
          <OnboardingWizard />
        </main>
      </div>
    </OnboardingProvider>
  );
}
