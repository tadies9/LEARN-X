'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingStep, Persona } from '@/lib/types/persona';
import { analyticsApi } from '@/lib/api/analytics';

// Temporary debug import
import '@/lib/api/test-persona-debug';

interface OnboardingContextType {
  currentStep: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  formData: Partial<Persona>;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  updateFormData: (data: Partial<Persona>) => void;
  completeOnboarding: () => Promise<void>;
  skipToReview: () => void;
  canSkipCurrent: () => boolean;
  isLoading: boolean;
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'academic-career',
  'interests',
  'learning-style',
  'content-preferences',
  'communication',
  'review',
];

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [formData, setFormData] = useState<Partial<Persona>>({});
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const stepStartTimeRef = useRef<number>(Date.now());

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;

  // Track onboarding start
  useEffect(() => {
    analyticsApi.trackOnboardingEvent('started');
  }, []);

  const nextStep = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < totalSteps) {
      // Track step completion
      const timeSpent = Date.now() - stepStartTimeRef.current;
      analyticsApi.trackOnboardingEvent('step_completed', currentStep, timeSpent);

      setCurrentStep(STEP_ORDER[nextIndex]);
      stepStartTimeRef.current = Date.now();
    }
  }, [stepIndex, totalSteps, currentStep]);

  const previousStep = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [stepIndex]);

  const goToStep = useCallback((step: OnboardingStep) => {
    if (STEP_ORDER.includes(step)) {
      setCurrentStep(step);
    }
  }, []);

  const updateFormData = useCallback((data: Partial<Persona>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const skipToReview = useCallback(() => {
    // Ensure minimum required data is present - check both new and legacy field names
    if ((!formData.academicCareer && !formData.professional) || !formData.interests || !formData.learningStyle) {
      return;
    }

    // Track skip event
    analyticsApi.trackOnboardingEvent('skipped', currentStep);

    setCurrentStep('review');
    stepStartTimeRef.current = Date.now();
  }, [formData, currentStep]);

  const canSkipCurrent = useCallback(() => {
    // Can skip if we have the minimum required data - check both new and legacy field names
    const hasMinimumData = !!(
      (formData.academicCareer || formData.professional) &&
      formData.interests &&
      formData.learningStyle
    );

    // Can't skip from welcome or if already at review
    const canSkip = hasMinimumData && currentStep !== 'welcome' && currentStep !== 'review';

    return canSkip;
  }, [currentStep, formData]);

  const completeOnboarding = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Starting onboarding completion...');
      
      const { personaApi } = await import('@/lib/api/persona');
      
      // Use the new field names, with fallback to legacy names for backward compatibility
      const academicCareerData = formData.academicCareer || formData.professional;
      
      // Apply defaults for skipped sections
      const personaWithDefaults = {
        academicCareer: academicCareerData!,
        interests: formData.interests!,
        learningStyle: formData.learningStyle!,
        contentPreferences: formData.contentPreferences || {
          density: 'balanced',
          examplesPerConcept: 2,
          summaryStyle: 'bullet_points',
          detailTolerance: 'medium',
          repetitionPreference: 'moderate',
        },
        communication: formData.communication || {
          style: 'professional_friendly',
          encouragementLevel: 'moderate',
          humorAppropriate: false,
        },
      };

      console.log('🔍 Saving persona data...');
      // Save persona data to backend
      const result = await personaApi.upsertPersona(personaWithDefaults);
      console.log('✅ Persona saved successfully:', result);

      console.log('🔍 Tracking completion analytics...');
      // Track completion
      const totalTime = Date.now() - startTimeRef.current;
      await analyticsApi.trackOnboardingEvent('completed', 'review', totalTime, {
        skippedSteps: !formData.contentPreferences || !formData.communication,
      });
      console.log('✅ Analytics tracked successfully');

      console.log('🔍 Redirecting to dashboard...');
      // Redirect to dashboard
      router.push('/dashboard');
      console.log('✅ Redirect initiated');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      // Throw error to be handled by the component using this context
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [formData, router]);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        stepIndex,
        totalSteps,
        formData,
        nextStep,
        previousStep,
        goToStep,
        updateFormData,
        completeOnboarding,
        skipToReview,
        canSkipCurrent,
        isLoading,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
