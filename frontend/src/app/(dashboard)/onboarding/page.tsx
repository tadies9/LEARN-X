'use client';

import Image from 'next/image';
import { OnboardingProvider } from '@/contexts/onboarding-context';

import { OnboardingWizard } from './components/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Simple header with logo */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
