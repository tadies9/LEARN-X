import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { differenceInDays, startOfDay, subDays, format } from 'date-fns';

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

interface UserActivity {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, any>;
  timestamp: string;
}

interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  todayCompleted: boolean;
  daysThisWeek: number;
}

class DashboardService {
  async getUserStats(userId: string): Promise<DashboardStats> {
    try {
      // Get study time stats
      const studyTime = await this.getStudyTimeStats(userId);
      
      // Get streak information
      const streak = await this.getStreakInfo(userId);
      
      // Get course statistics
      const courses = await this.getCourseStats(userId);
      
      // Get progress metrics
      const progress = await this.getProgressStats(userId);

      return {
        studyTime,
        streak: {
          current: streak.current,
          longest: streak.longest,
          lastActiveDate: streak.lastActiveDate,
        },
        courses,
        progress,
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  private async getStudyTimeStats(userId: string) {
    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);

    // Get today's study time
    const { data: todayData } = await supabase
      .from('study_sessions')
      .select('duration')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .lte('created_at', new Date().toISOString());

    const todayMinutes = todayData?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;

    // Get this week's study time
    const { data: weekData } = await supabase
      .from('study_sessions')
      .select('duration')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString())
      .lte('created_at', new Date().toISOString());

    const weekMinutes = weekData?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;

    // Get total study time
    const { data: totalData } = await supabase
      .from('study_sessions')
      .select('duration')
      .eq('user_id', userId);

    const totalMinutes = totalData?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;

    return {
      today: Math.round(todayMinutes / 60), // Convert to hours
      thisWeek: Math.round(weekMinutes / 60),
      total: Math.round(totalMinutes / 60),
    };
  }

  async getStreakInfo(userId: string): Promise<StreakInfo> {
    try {
      // Get user's activity dates
      const { data: activities } = await supabase
        .from('study_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!activities || activities.length === 0) {
        return {
          current: 0,
          longest: 0,
          lastActiveDate: null,
          todayCompleted: false,
          daysThisWeek: 0,
        };
      }

      // Group activities by date
      const activityDates = new Set(
        activities.map(a => format(new Date(a.created_at), 'yyyy-MM-dd'))
      );

      const today = format(new Date(), 'yyyy-MM-dd');
      const todayCompleted = activityDates.has(today);

      // Calculate current streak
      let currentStreak = 0;
      let checkDate = new Date();
      
      if (!todayCompleted) {
        checkDate = subDays(checkDate, 1);
      }

      while (activityDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }

      // Calculate longest streak
      const sortedDates = Array.from(activityDates).sort();
      let longestStreak = 0;
      let tempStreak = 0;
      
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = new Date(sortedDates[i - 1]);
          const currDate = new Date(sortedDates[i]);
          const dayDiff = differenceInDays(currDate, prevDate);
          
          if (dayDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // Calculate days this week
      const weekStart = subDays(today, 6);
      const daysThisWeek = Array.from(activityDates).filter(date => {
        return date >= weekStart && date <= today;
      }).length;

      const lastActiveDate = sortedDates[sortedDates.length - 1] || null;

      return {
        current: currentStreak,
        longest: longestStreak,
        lastActiveDate,
        todayCompleted,
        daysThisWeek,
      };
    } catch (error) {
      logger.error('Error calculating streak:', error);
      throw error;
    }
  }

  private async getCourseStats(userId: string) {
    // Get course counts
    const { data: courseCounts } = await supabase
      .from('courses')
      .select('status')
      .eq('user_id', userId);

    const active = courseCounts?.filter(c => c.status === 'active').length || 0;
    const completed = courseCounts?.filter(c => c.status === 'completed').length || 0;
    const archived = courseCounts?.filter(c => c.status === 'archived').length || 0;

    // Get module statistics
    const { data: modules } = await supabase
      .from('modules')
      .select(`
        id,
        course:courses!inner(user_id)
      `)
      .eq('course.user_id', userId);

    const totalModules = modules?.length || 0;

    // Get completed modules (this would need a module_progress table)
    // For now, we'll return 0 as this feature needs to be implemented
    const completedModules = 0;

    return {
      active,
      completed,
      archived,
      totalModules,
      completedModules,
    };
  }

  private async getProgressStats(userId: string) {
    // Calculate overall completion percentage
    const { data: progressData } = await supabase
      .from('study_progress')
      .select('completion_percentage')
      .eq('user_id', userId);

    const totalProgress = progressData?.reduce((sum, p) => sum + p.completion_percentage, 0) || 0;
    const overallCompletion = progressData?.length ? Math.round(totalProgress / progressData.length) : 0;

    // Weekly goal progress (assuming 10 hours per week goal)
    const { studyTime } = await this.getStudyTimeStats(userId);
    const weeklyGoalProgress = Math.min(100, Math.round((studyTime.thisWeek / 10) * 100));

    // Mastered concepts (files with >80% completion)
    const masteredConcepts = progressData?.filter(p => p.completion_percentage >= 80).length || 0;

    return {
      overallCompletion,
      weeklyGoalProgress,
      masteredConcepts,
    };
  }

  async getRecentActivity(userId: string, limit: number = 10): Promise<UserActivity[]> {
    try {
      const { data: activities } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      return activities || [];
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  async getPersonalizedRecommendations(userId: string) {
    try {
      // Get user's persona and recent courses
      const { data: persona } = await supabase
        .from('personas')
        .select('interests, academic_career')
        .eq('user_id', userId)
        .single();

      const { data: recentCourses } = await supabase
        .from('courses')
        .select('title, description')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Generate recommendations based on interests and gaps
      const recommendations = this.generateRecommendations(persona, recentCourses || []);

      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  private generateRecommendations(persona: any, recentCourses: any[]) {
    const recommendations = [];
    const recentTopics = recentCourses.map(c => c.title.toLowerCase());

    // Example recommendation logic
    if (persona?.interests?.primary?.includes('Web Development')) {
      if (!recentTopics.some(t => t.includes('react'))) {
        recommendations.push({
          title: 'React Fundamentals',
          description: 'Master modern React development with hooks and best practices',
          reason: 'Based on your interest in Web Development',
          difficulty: 'intermediate',
        });
      }
    }

    // Add more recommendation logic based on persona data

    return recommendations;
  }

  async logActivity(data: {
    userId: string;
    type: string;
    metadata?: Record<string, any>;
  }): Promise<UserActivity> {
    try {
      const { data: activity, error } = await supabase
        .from('activity_log')
        .insert({
          user_id: data.userId,
          type: data.type,
          metadata: data.metadata || {},
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return activity;
    } catch (error) {
      logger.error('Error logging activity:', error);
      throw error;
    }
  }

  async updateStreak(userId: string) {
    try {
      // Update streak when user has activity today
      const streak = await this.getStreakInfo(userId);
      
      // Store streak info in user metadata or a dedicated table
      const { error } = await supabase
        .from('profiles')
        .update({
          metadata: {
            streak: {
              current: streak.current,
              longest: streak.longest,
              lastUpdate: new Date().toISOString(),
            },
          },
        })
        .eq('id', userId);

      if (error) throw error;

      return streak;
    } catch (error) {
      logger.error('Error updating streak:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();