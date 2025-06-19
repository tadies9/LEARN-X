import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { DirectPostgresService } from './database/DirectPostgresService';

interface OnboardingEvent {
  userId: string;
  event: 'started' | 'step_completed' | 'skipped' | 'completed' | 'abandoned';
  step?: string;
  timeSpent?: number;
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  private directPg: DirectPostgresService;

  constructor() {
    this.directPg = new DirectPostgresService();
  }
  async trackOnboardingEvent(event: OnboardingEvent) {
    try {
      const { error } = await supabase.from('onboarding_analytics').insert({
        user_id: event.userId,
        event_type: event.event,
        step: event.step,
        time_spent: event.timeSpent,
        metadata: event.metadata,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      logger.error('Error tracking onboarding event:', error);
      // Don't throw - analytics shouldn't break the flow
    }
  }

  async getOnboardingStats(userId?: string) {
    try {
      let query = supabase.from('onboarding_analytics').select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate stats
      const stats = {
        totalStarted: 0,
        totalCompleted: 0,
        averageTimeToComplete: 0,
        stepCompletionRates: {} as Record<string, number>,
        dropOffPoints: {} as Record<string, number>,
        skipRates: {} as Record<string, number>,
      };

      if (!data) return stats;

      // Process the data
      const userJourneys = new Map<string, any[]>();

      data.forEach((event) => {
        if (!userJourneys.has(event.user_id)) {
          userJourneys.set(event.user_id, []);
        }
        userJourneys.get(event.user_id)!.push(event);
      });

      userJourneys.forEach((journey) => {
        const started = journey.find((e) => e.event_type === 'started');
        const completed = journey.find((e) => e.event_type === 'completed');

        if (started) stats.totalStarted++;
        if (completed) {
          stats.totalCompleted++;
          if (started && completed.time_spent) {
            stats.averageTimeToComplete += completed.time_spent;
          }
        }

        // Track step completions
        journey.forEach((event) => {
          if (event.event_type === 'step_completed' && event.step) {
            stats.stepCompletionRates[event.step] =
              (stats.stepCompletionRates[event.step] || 0) + 1;
          }
          if (event.event_type === 'skipped' && event.step) {
            stats.skipRates[event.step] = (stats.skipRates[event.step] || 0) + 1;
          }
          if (event.event_type === 'abandoned' && event.step) {
            stats.dropOffPoints[event.step] = (stats.dropOffPoints[event.step] || 0) + 1;
          }
        });
      });

      // Calculate averages
      if (stats.totalCompleted > 0) {
        stats.averageTimeToComplete /= stats.totalCompleted;
      }

      // Convert counts to rates
      Object.keys(stats.stepCompletionRates).forEach((step) => {
        stats.stepCompletionRates[step] = stats.stepCompletionRates[step] / stats.totalStarted;
      });

      Object.keys(stats.skipRates).forEach((step) => {
        stats.skipRates[step] = stats.skipRates[step] / stats.totalStarted;
      });

      return stats;
    } catch (error) {
      logger.error('Error getting onboarding stats:', error);
      throw error;
    }
  }

  async getPersonaInsights() {
    try {
      const { data: personas, error } = await supabase
        .from('personas')
        .select(
          'professional_context, personal_interests, learning_style, content_preferences, communication_tone'
        );

      if (error) throw error;

      if (!personas || personas.length === 0) {
        return { totalPersonas: 0 };
      }

      // Aggregate insights
      const insights = {
        totalPersonas: personas.length,
        industries: {} as Record<string, number>,
        technicalLevels: {} as Record<string, number>,
        learningStyles: {} as Record<string, number>,
        contentDensities: {} as Record<string, number>,
        communicationStyles: {} as Record<string, number>,
        topInterests: {} as Record<string, number>,
        topLearningTopics: {} as Record<string, number>,
      };

      personas.forEach((persona) => {
        // Professional context
        if (persona.professional_context) {
          const industry = persona.professional_context.industry;
          insights.industries[industry] = (insights.industries[industry] || 0) + 1;

          const level = persona.professional_context.technicalLevel;
          insights.technicalLevels[level] = (insights.technicalLevels[level] || 0) + 1;
        }

        // Learning style
        if (persona.learning_style) {
          const style = persona.learning_style.primary;
          insights.learningStyles[style] = (insights.learningStyles[style] || 0) + 1;
        }

        // Content preferences
        if (persona.content_preferences) {
          const density = persona.content_preferences.density;
          insights.contentDensities[density] = (insights.contentDensities[density] || 0) + 1;
        }

        // Communication tone
        if (persona.communication_tone) {
          const style = persona.communication_tone.style;
          insights.communicationStyles[style] = (insights.communicationStyles[style] || 0) + 1;
        }

        // Interests
        if (persona.personal_interests) {
          persona.personal_interests.primary?.forEach((interest: string) => {
            insights.topInterests[interest] = (insights.topInterests[interest] || 0) + 1;
          });

          persona.personal_interests.learningTopics?.forEach((topic: string) => {
            insights.topLearningTopics[topic] = (insights.topLearningTopics[topic] || 0) + 1;
          });
        }
      });

      // Sort and limit top items
      const sortByCount = (obj: Record<string, number>) =>
        Object.entries(obj)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      insights.topInterests = sortByCount(insights.topInterests);
      insights.topLearningTopics = sortByCount(insights.topLearningTopics);

      return insights;
    } catch (error) {
      logger.error('Error getting persona insights:', error);
      throw error;
    }
  }

  /**
   * Get aggregated analytics using direct Postgres for performance
   */
  async getAggregatedAnalytics(userIds?: string[], timeRange?: { start: Date; end: Date }) {
    try {
      // Use direct Postgres for bulk analytics
      const analytics = await this.directPg.bulkFetchAnalytics(
        userIds || [],
        undefined,
        timeRange
      );

      // Aggregate the data
      const aggregated = {
        totalEvents: analytics.length,
        uniqueUsers: new Set(analytics.map(a => a.userId)).size,
        eventsByType: {} as Record<string, number>,
        averageValue: 0,
        timeline: [] as Array<{ date: string; count: number }>,
      };

      // Process analytics
      let totalValue = 0;
      const dailyCounts = new Map<string, number>();

      analytics.forEach(event => {
        // Count by metric/type
        aggregated.eventsByType[event.metric] = (aggregated.eventsByType[event.metric] || 0) + 1;
        
        // Sum values
        totalValue += event.value;
        
        // Daily timeline
        const date = event.timestamp.toISOString().split('T')[0];
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
      });

      // Calculate average
      aggregated.averageValue = analytics.length > 0 ? totalValue / analytics.length : 0;

      // Convert timeline map to array
      aggregated.timeline = Array.from(dailyCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return aggregated;
    } catch (error) {
      logger.error('Error getting aggregated analytics:', error);
      throw error;
    }
  }

  /**
   * Bulk insert analytics events using direct Postgres
   */
  async bulkInsertEvents(events: Array<{
    userId: string;
    eventType: string;
    metadata: Record<string, any>;
  }>) {
    try {
      const bulkEvents = events.map(e => ({
        userId: e.userId,
        eventType: e.eventType,
        metadata: e.metadata,
        timestamp: new Date()
      }));

      await this.directPg.bulkInsertEvents(bulkEvents);
      
      logger.info(`Bulk inserted ${events.length} analytics events`);
    } catch (error) {
      logger.error('Error bulk inserting events:', error);
      // Don't throw - analytics shouldn't break the flow
    }
  }
}
