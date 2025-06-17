'use client';

import Image from 'next/image';
import { OnboardingProvider } from '@/contexts/onboarding-context';

import { OnboardingWizard } from './components/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        {/* Simple header with logo */}
        <header className="border-b-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 shadow-md">
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
