import { API_CLIENT } from '@/lib/api/client';

export const analyticsApi = {
  // Track onboarding event
  trackOnboardingEvent: async (
    event: 'started' | 'step_completed' | 'skipped' | 'completed' | 'abandoned',
    step?: string,
    timeSpent?: number,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await API_CLIENT.post('/analytics/onboarding', {
        event,
        step,
        timeSpent,
        metadata,
      });
    } catch (error) {
      // Don't throw - analytics shouldn't break the flow
      console.error('Failed to track event:', error);
    }
  },

  // Get onboarding stats (admin only)
  getOnboardingStats: async () => {
    const response = await API_CLIENT.get<{ success: boolean; data: Record<string, unknown> }>(
      '/analytics/onboarding/stats'
    );
    return response.data.data;
  },

  // Get persona insights (admin only)
  getPersonaInsights: async () => {
    const response = await API_CLIENT.get<{ success: boolean; data: Record<string, unknown> }>(
      '/analytics/persona/insights'
    );
    return response.data.data;
  },
};
