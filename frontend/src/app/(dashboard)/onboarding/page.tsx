'use client';

import { OnboardingProvider } from '@/contexts/onboarding-context';
import { OnboardingWizard } from './components/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-background">
        <OnboardingWizard />
      </div>
    </OnboardingProvider>
  );
}
