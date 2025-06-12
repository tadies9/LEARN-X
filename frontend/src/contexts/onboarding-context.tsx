'use client'

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { OnboardingStep, Persona } from '@/lib/types/persona'
import { analyticsApi } from '@/lib/api/analytics'

interface OnboardingContextType {
  currentStep: OnboardingStep
  stepIndex: number
  totalSteps: number
  formData: Partial<Persona>
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: OnboardingStep) => void
  updateFormData: (data: Partial<Persona>) => void
  completeOnboarding: () => Promise<void>
  skipToReview: () => void
  canSkipCurrent: () => boolean
  isLoading: boolean
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'professional',
  'interests',
  'learning-style',
  'content-preferences',
  'communication',
  'review',
]

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [formData, setFormData] = useState<Partial<Persona>>({})
  const [isLoading, setIsLoading] = useState(false)
  const startTimeRef = useRef<number>(Date.now())
  const stepStartTimeRef = useRef<number>(Date.now())

  const stepIndex = STEP_ORDER.indexOf(currentStep)
  const totalSteps = STEP_ORDER.length

  // Track onboarding start
  useEffect(() => {
    analyticsApi.trackOnboardingEvent('started')
  }, [])

  const nextStep = useCallback(() => {
    const nextIndex = stepIndex + 1
    if (nextIndex < totalSteps) {
      // Track step completion
      const timeSpent = Date.now() - stepStartTimeRef.current
      analyticsApi.trackOnboardingEvent('step_completed', currentStep, timeSpent)
      
      setCurrentStep(STEP_ORDER[nextIndex])
      stepStartTimeRef.current = Date.now()
    }
  }, [stepIndex, totalSteps, currentStep])

  const previousStep = useCallback(() => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex])
    }
  }, [stepIndex])

  const goToStep = useCallback((step: OnboardingStep) => {
    if (STEP_ORDER.includes(step)) {
      setCurrentStep(step)
    }
  }, [])

  const updateFormData = useCallback((data: Partial<Persona>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

  const skipToReview = useCallback(() => {
    // Ensure minimum required data is present
    if (!formData.professional || !formData.interests || !formData.learningStyle) {
      return
    }
    
    // Track skip event
    analyticsApi.trackOnboardingEvent('skipped', currentStep)
    
    setCurrentStep('review')
    stepStartTimeRef.current = Date.now()
  }, [formData, currentStep])

  const canSkipCurrent = useCallback(() => {
    // Can skip if we have the minimum required data
    const hasMinimumData = 
      formData.professional && 
      formData.interests && 
      formData.learningStyle
    
    // Can't skip from welcome or if already at review
    const canSkip = hasMinimumData && 
      currentStep !== 'welcome' && 
      currentStep !== 'review'
    
    return canSkip
  }, [currentStep, formData])

  const completeOnboarding = useCallback(async () => {
    setIsLoading(true)
    try {
      // Import at the top of the file
      const { personaApi } = await import('@/lib/api/persona')
      const { toast } = await import('@/components/ui/use-toast')
      
      // Apply defaults for skipped sections
      const personaWithDefaults = {
        professional: formData.professional!,
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
          technicalComfort: 0.5,
          encouragementLevel: 'moderate',
          humorAppropriate: false,
        },
      }
      
      // Save persona data to backend
      await personaApi.upsertPersona(personaWithDefaults)

      // Track completion
      const totalTime = Date.now() - startTimeRef.current
      analyticsApi.trackOnboardingEvent('completed', 'review', totalTime, {
        skippedSteps: !formData.contentPreferences || !formData.communication,
      })

      toast({
        title: 'Welcome to LEARN-X!',
        description: 'Your personalized learning profile has been created.',
      })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      const { toast } = await import('@/components/ui/use-toast')
      toast({
        title: 'Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [formData, router])

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
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}