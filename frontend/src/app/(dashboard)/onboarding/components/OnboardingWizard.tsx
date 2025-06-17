'use client';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Progress } from '@/components/ui/progress';

import { WelcomeStep } from './steps/WelcomeStep';
import { ProfessionalStep } from './steps/ProfessionalStep';
import { InterestsStep } from './steps/InterestsStep';
import { LearningStyleStep } from './steps/LearningStyleStep';
import { ContentPreferencesStep } from './steps/ContentPreferencesStep';
import { CommunicationStep } from './steps/CommunicationStep';
import { ReviewStep } from './steps/ReviewStep';

import type { OnboardingStep } from '@/lib/types/persona';

const STEP_COMPONENTS: Record<OnboardingStep, React.ComponentType> = {
  welcome: WelcomeStep,
  professional: ProfessionalStep,
  interests: InterestsStep,
  'learning-style': LearningStyleStep,
  'content-preferences': ContentPreferencesStep,
  communication: CommunicationStep,
  review: ReviewStep,
};

export function OnboardingWizard() {
  const { currentStep, stepIndex, totalSteps, canSkipCurrent, skipToReview } = useOnboarding();
  const StepComponent = STEP_COMPONENTS[currentStep];

  // Calculate progress (exclude welcome and review steps)
  const progressSteps = totalSteps - 2; // Exclude welcome and review
  const currentProgressStep = Math.max(0, stepIndex - 1); // Start counting after welcome
  const progress =
    currentStep === 'welcome'
      ? 0
      : currentStep === 'review'
        ? 100
        : (currentProgressStep / progressSteps) * 100;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Progress Bar - hidden on welcome step */}
      {currentStep !== 'welcome' && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    Step {currentProgressStep + 1} of {progressSteps}
                  </span>
                  <span className="text-primary font-semibold">{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              {canSkipCurrent() && (
                <button
                  onClick={skipToReview}
                  className="ml-6 text-sm text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
                >
                  Skip to review
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div>
        <StepComponent />
      </div>
    </div>
  );
}
