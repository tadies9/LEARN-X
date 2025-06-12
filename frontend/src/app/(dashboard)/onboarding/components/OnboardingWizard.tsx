'use client'

import { useOnboarding } from '@/contexts/onboarding-context'
import { Progress } from '@/components/ui/progress'
import { WelcomeStep } from './steps/WelcomeStep'
import { ProfessionalStep } from './steps/ProfessionalStep'
import { InterestsStep } from './steps/InterestsStep'
import { LearningStyleStep } from './steps/LearningStyleStep'
import { ContentPreferencesStep } from './steps/ContentPreferencesStep'
import { CommunicationStep } from './steps/CommunicationStep'
import { ReviewStep } from './steps/ReviewStep'
import type { OnboardingStep } from '@/lib/types/persona'

const STEP_COMPONENTS: Record<OnboardingStep, React.ComponentType> = {
  welcome: WelcomeStep,
  professional: ProfessionalStep,
  interests: InterestsStep,
  'learning-style': LearningStyleStep,
  'content-preferences': ContentPreferencesStep,
  communication: CommunicationStep,
  review: ReviewStep,
}

export function OnboardingWizard() {
  const { currentStep, stepIndex, totalSteps, canSkipCurrent, skipToReview } = useOnboarding()
  const StepComponent = STEP_COMPONENTS[currentStep]

  // Calculate progress (exclude welcome and review steps)
  const progressSteps = totalSteps - 2 // Exclude welcome and review
  const currentProgressStep = Math.max(0, stepIndex - 1) // Start counting after welcome
  const progress = currentStep === 'welcome' ? 0 : 
                  currentStep === 'review' ? 100 : 
                  (currentProgressStep / progressSteps) * 100

  return (
    <div className="container max-w-3xl mx-auto py-8">
      {/* Progress Bar - hidden on welcome step */}
      {currentStep !== 'welcome' && (
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentProgressStep + 1} of {progressSteps}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            {canSkipCurrent() && (
              <button
                onClick={skipToReview}
                className="ml-4 text-sm text-muted-foreground hover:text-foreground underline"
              >
                Skip to review
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-card rounded-lg shadow-sm">
        <StepComponent />
      </div>
    </div>
  )
}