'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personaApi } from '@/lib/api/persona';
import { useAuth } from '@/hooks/useAuth';
import type { UserPersona } from '@/lib/types/persona';

export function usePersona() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: persona,
    isLoading,
    error,
    refetch,
  } = useQuery<UserPersona | null>({
    queryKey: ['persona', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await personaApi.getPersona();
        return response.data;
      } catch (error) {
        // If persona doesn't exist, return null instead of throwing
        console.log('No persona found for user');
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const updatePersona = useMutation({
    mutationFn: (data: Partial<UserPersona>) => personaApi.updatePersona(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona', user?.id] });
    },
  });

  const updatePersonaSection = useMutation({
    mutationFn: ({ section, data }: { section: string; data: any }) =>
      personaApi.updatePersonaSection(section, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona', user?.id] });
    },
  });

  return {
    persona,
    isLoading,
    error,
    refetch,
    updatePersona: updatePersona.mutate,
    updatePersonaSection: updatePersonaSection.mutate,
    isUpdating: updatePersona.isLoading || updatePersonaSection.isLoading,
  };
}

// Helper function to get persona interests as an array
export function usePersonaInterests() {
  const { persona } = usePersona();
  
  if (!persona?.personal_interests) return [];
  
  const interests = [
    ...(persona.personal_interests.primary || []),
    ...(persona.personal_interests.secondary || []),
    ...(persona.personal_interests.learningTopics || []),
  ];
  
  return [...new Set(interests)]; // Remove duplicates
}

// Helper function to get personalized greeting based on communication style
export function usePersonalizedGreeting(userName: string) {
  const { persona } = usePersona();
  
  if (!persona?.communication_tone?.style) {
    return `Welcome back, ${userName}`;
  }

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  switch (persona.communication_tone.style) {
    case 'casual':
      return `Hey ${userName}! Ready to learn something cool?`;
    case 'professional':
      return `Good ${timeOfDay}, ${userName}. Let's continue your learning journey.`;
    case 'enthusiastic':
      return `🚀 Welcome back, ${userName}! Excited to dive into today's learning?`;
    case 'zen':
      return `Welcome, ${userName}. Take a moment to settle in.`;
    default:
      return `Welcome back, ${userName}`;
  }
}