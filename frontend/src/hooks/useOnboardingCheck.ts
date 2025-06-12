import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { personaApi } from '@/lib/api/persona';

export function useOnboardingCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        // Skip check if already on onboarding page
        if (pathname === '/onboarding') {
          setIsChecking(false);
          return;
        }

        // Check if user is authenticated
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsChecking(false);
          return;
        }

        // Check if user has completed onboarding
        try {
          const persona = await personaApi.getPersona();
          setNeedsOnboarding(!persona);
        } catch (error: any) {
          // If 404, user needs onboarding
          if (error.response?.status === 404) {
            setNeedsOnboarding(true);
          }
        }

        // Redirect to onboarding if needed
        if (needsOnboarding && pathname !== '/onboarding') {
          router.push('/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkOnboarding();
  }, [pathname, router, needsOnboarding]);

  return { isChecking, needsOnboarding };
}
