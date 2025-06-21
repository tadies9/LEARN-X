import { logger } from '../../utils/logger';
import { DashboardDataService } from './DashboardDataService';
import { DashboardAggregationService } from './DashboardAggregationService';
import { DashboardCacheService } from './DashboardCacheService';
import { supabase } from '../../config/supabase';
import { redisClient } from '../../config/redis';

interface DashboardStats {
  studyTime: {
    today: number;
    thisWeek: number;
    total: number;
  };
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string | null;
  };
  courses: {
    active: number;
    completed: number;
    archived: number;
    totalModules: number;
    completedModules: number;
  };
  progress: {
    overallCompletion: number;
    weeklyGoalProgress: number;
    masteredConcepts: number;
  };
}

interface DetailedDashboard extends DashboardStats {
  activities: {
    recent: Array<{
      id: string;
      type: string;
      metadata: Record<string, any>;
      timestamp: string;
    }>;
    weeklyPattern: Array<{
      dayOfWeek: string;
      averageMinutes: number;
      sessions: number;
    }>;
  };
  insights: {
    learningVelocity: number;
    consistencyScore: number;
    recommendedFocusArea: string | null;
  };
}

/**
 * Main dashboard service that orchestrates data fetching, aggregation, and caching
 * Delegates specific responsibilities to specialized services
 */
export class DashboardService {
  private dataService: DashboardDataService;
  private aggregationService: DashboardAggregationService;
  private cacheService: DashboardCacheService;

  constructor() {
    this.dataService = new DashboardDataService();
    this.aggregationService = new DashboardAggregationService();
    this.cacheService = new DashboardCacheService(redisClient);
  }

  /**
   * Get user dashboard statistics
   */
  async getUserStats(userId: string): Promise<DashboardStats> {
    try {
      // Try cache first
      const cacheKey = `user:${userId}:stats`;
      const cached = await this.cacheService.get<DashboardStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch fresh data
      const stats = await this.calculateUserStats(userId);

      // Cache the result
      await this.cacheService.set(cacheKey, stats, {
        ttl: this.cacheService.getTTLForDataType('stats'),
      });

      return stats;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed dashboard with insights
   */
  async getDetailedDashboard(userId: string): Promise<DetailedDashboard> {
    try {
      // Get basic stats
      const stats = await this.getUserStats(userId);

      // Get recent activities
      const activities = await this.cacheService.getOrSet(
        `user:${userId}:activities`,
        () => this.dataService.getRecentActivities(userId, 20),
        { ttl: this.cacheService.getTTLForDataType('activities') }
      );

      // Get study sessions for patterns
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const sessions = await this.dataService.getStudySessions(userId, startDate, endDate);
      const weeklyPattern = this.aggregationService.calculateWeeklyPatterns(sessions);

      // Calculate insights
      const insights = await this.calculateInsights(userId, stats, sessions);

      return {
        ...stats,
        activities: {
          recent: activities,
          weeklyPattern,
        },
        insights,
      };
    } catch (error) {
      logger.error('Error getting detailed dashboard:', error);
      throw error;
    }
  }

  /**
   * Get recent user activity
   */
  async getRecentActivity(
    userId: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      type: string;
      metadata: Record<string, any>;
      timestamp: string;
    }>
  > {
    try {
      // Try cache first
      const cacheKey = `user:${userId}:recent_activity:${limit}`;
      const cached = await this.cacheService.get<Array<any>>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch fresh data
      const activities = await this.dataService.getRecentActivities(userId, limit);

      // Cache the result
      await this.cacheService.set(cacheKey, activities, {
        ttl: this.cacheService.getTTLForDataType('activities'),
      });

      return activities;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Get user streak information
   */
  async getStreakInfo(userId: string): Promise<{
    current: number;
    longest: number;
    lastActiveDate: string | null;
  }> {
    try {
      // Try cache first
      const cacheKey = `user:${userId}:streak`;
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch study sessions for streak calculation
      const sessions = await this.getStudySessionsForStreak(userId);
      const streakInfo = this.aggregationService.calculateStreakInfo(sessions);

      // Cache the result
      await this.cacheService.set(cacheKey, streakInfo, {
        ttl: this.cacheService.getTTLForDataType('stats'),
      });

      return streakInfo;
    } catch (error) {
      logger.error('Error getting streak info:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(userId: string): Promise<
    Array<{
      type: string;
      title: string;
      description: string;
      actionUrl?: string;
      priority: 'low' | 'medium' | 'high';
    }>
  > {
    try {
      // Simple implementation - can be enhanced later
      const stats = await this.getUserStats(userId);
      const recommendations = [];

      // Based on completion rate
      if (stats.progress.overallCompletion < 30) {
        recommendations.push({
          type: 'completion',
          title: 'Focus on Course Completion',
          description: 'Complete your current courses to unlock more learning opportunities',
          priority: 'high' as const,
        });
      }

      // Based on streak
      if (stats.streak.current === 0) {
        recommendations.push({
          type: 'consistency',
          title: 'Build a Study Streak',
          description: 'Start a daily learning habit to improve retention',
          priority: 'medium' as const,
        });
      }

      // Based on weekly goal
      if (stats.progress.weeklyGoalProgress < 50) {
        recommendations.push({
          type: 'time',
          title: 'Increase Study Time',
          description: 'Try shorter, more frequent study sessions',
          priority: 'medium' as const,
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Log user activity (alias for recordActivity)
   */
  async logActivity(
    userId: string,
    activity: {
      type: string;
      metadata: Record<string, any>;
    }
  ): Promise<void> {
    return this.recordActivity(userId, activity);
  }

  /**
   * Update user streak information
   */
  async updateStreak(userId: string): Promise<{
    current: number;
    longest: number;
    lastActiveDate: string | null;
  }> {
    try {
      // Record today's activity if not already recorded
      const today = new Date().toISOString().split('T')[0];

      // Check if user already has activity today
      const { data: todayActivity } = await supabase
        .from('user_activities')
        .select('id')
        .eq('user_id', userId)
        .gte('timestamp', `${today}T00:00:00.000Z`)
        .limit(1);

      if (!todayActivity || todayActivity.length === 0) {
        // Record today's activity
        await this.recordActivity(userId, {
          type: 'study_session',
          metadata: { autoRecorded: true },
        });
      }

      // Invalidate streak cache and recalculate
      await this.cacheService.invalidate(`user:${userId}:streak`);
      return this.getStreakInfo(userId);
    } catch (error) {
      logger.error('Error updating streak:', error);
      throw error;
    }
  }

  /**
   * Update user activity and invalidate relevant caches
   */
  async recordActivity(
    userId: string,
    activity: {
      type: string;
      metadata: Record<string, any>;
    }
  ): Promise<void> {
    try {
      // Record the activity
      const { error } = await supabase.from('user_activities').insert({
        user_id: userId,
        type: activity.type,
        metadata: activity.metadata,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      // Invalidate relevant caches
      await this.cacheService.invalidate(`user:${userId}:activities`);
      await this.cacheService.invalidate(`user:${userId}:stats`);
    } catch (error) {
      logger.error('Error recording activity:', error);
      throw error;
    }
  }

  /**
   * Calculate user statistics (internal method)
   */
  private async calculateUserStats(userId: string): Promise<DashboardStats> {
    // Parallel fetch all data
    const [studyTime, courseStats, studySessions] = await Promise.all([
      this.dataService.getStudyTimeStats(userId),
      this.dataService.getCourseStats(userId),
      this.getStudySessionsForStreak(userId),
    ]);

    // Calculate streak info
    const streakInfo = this.aggregationService.calculateStreakInfo(studySessions);

    // Get weekly goal and mastered concepts
    const weeklyGoal = await this.getUserWeeklyGoal(userId);
    const masteredCount = await this.getMasteredConceptsCount(userId);

    // Calculate progress
    const progress = this.aggregationService.calculateProgressStats(
      courseStats.totalModules,
      courseStats.completedModules,
      weeklyGoal,
      studyTime.thisWeek,
      masteredCount
    );

    return {
      studyTime,
      streak: {
        current: streakInfo.current,
        longest: streakInfo.longest,
        lastActiveDate: streakInfo.lastActiveDate,
      },
      courses: courseStats,
      progress,
    };
  }

  /**
   * Calculate insights for the dashboard
   */
  private async calculateInsights(
    userId: string,
    stats: DashboardStats,
    sessions: any[]
  ): Promise<DetailedDashboard['insights']> {
    // Get mastered concepts with dates
    const { data: masteredConcepts } = await supabase
      .from('user_progress')
      .select('mastered_at')
      .eq('user_id', userId)
      .eq('mastery_level', 100);

    const learningVelocity = this.aggregationService.calculateLearningVelocity(
      masteredConcepts || []
    );

    const consistencyScore = this.aggregationService.calculateConsistencyScore(sessions);

    // Determine recommended focus area
    const recommendedFocusArea = this.determineRecommendedFocus(stats, consistencyScore);

    return {
      learningVelocity,
      consistencyScore,
      recommendedFocusArea,
    };
  }

  /**
   * Helper methods
   */
  private async getStudySessionsForStreak(userId: string): Promise<any[]> {
    const { data } = await supabase
      .from('study_sessions')
      .select('created_at, duration')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(365); // Last year max

    return data || [];
  }

  private async getUserWeeklyGoal(userId: string): Promise<number> {
    const { data } = await supabase
      .from('user_preferences')
      .select('weekly_goal_minutes')
      .eq('user_id', userId)
      .single();

    return data?.weekly_goal_minutes || 300; // Default 5 hours/week
  }

  private async getMasteredConceptsCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mastery_level', 100);

    return count || 0;
  }

  private determineRecommendedFocus(
    stats: DashboardStats,
    consistencyScore: number
  ): string | null {
    if (consistencyScore < 50) {
      return 'Build a consistent study habit - aim for 5 days per week';
    }

    if (stats.progress.overallCompletion < 30 && stats.courses.active > 3) {
      return 'Focus on completing one course before starting new ones';
    }

    if (stats.progress.weeklyGoalProgress < 50) {
      return 'Try shorter, more frequent study sessions to reach your weekly goal';
    }

    return null;
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
