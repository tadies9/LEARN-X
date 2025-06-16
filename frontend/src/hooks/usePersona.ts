'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personaApi } from '@/lib/api/persona';
import { useAuth } from '@/hooks/useAuth';
import type { Persona } from '@/lib/types/persona';

export function usePersona() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: persona,
    isLoading,
    error,
    refetch,
  } = useQuery<Persona | null>({
    queryKey: ['persona', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await personaApi.getPersona();
        return response;
      } catch (error) {
        // If persona doesn't exist, return null instead of throwing
        console.log('No persona found for user');
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
  });

  const updatePersona = useMutation({
    mutationFn: (data: Partial<Persona>) => personaApi.upsertPersona(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona', user?.id] });
    },
  });

  const updatePersonaSection = useMutation({
    mutationFn: ({ section, data }: { section: string; data: any }) =>
      personaApi.updateSection(section, data),
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
    isUpdating: updatePersona.isPending || updatePersonaSection.isPending,
  };
}

// Helper function to get persona interests as an array
export function usePersonaInterests() {
  const { persona } = usePersona();

  if (!persona?.interests) return [];

  const interests = [
    ...(persona.interests.primary || []),
    ...(persona.interests.secondary || []),
    ...(persona.interests.learningTopics || []),
  ];

  return [...new Set(interests)]; // Remove duplicates
}

// Helper function to get personalized greeting based on communication style
export function usePersonalizedGreeting(userName: string) {
  const { persona } = usePersona();

  if (!persona?.communication?.style) {
    return `Welcome back, ${userName}`;
  }

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  switch (persona.communication.style) {
    case 'casual':
      return `Hey ${userName}! Ready to learn something cool?`;
    case 'professional_friendly':
      return `Good ${timeOfDay}, ${userName}. Let's continue your learning journey.`;
    case 'conversational':
      return `🚀 Welcome back, ${userName}! Excited to dive into today's learning?`;
    case 'formal':
      return `Good ${timeOfDay}, ${userName}. I trust you are ready to proceed with your studies.`;
    default:
      return `Welcome back, ${userName}`;
  }
}
