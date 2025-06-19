import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { startOfDay, subDays } from 'date-fns';

interface StudyTimeStats {
  today: number;
  thisWeek: number;
  total: number;
}

interface CourseStats {
  active: number;
  completed: number;
  archived: number;
  totalModules: number;
  completedModules: number;
}

interface UserActivity {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, any>;
  timestamp: string;
}

/**
 * Service for fetching dashboard data from the database
 * Focuses on data retrieval operations
 */
export class DashboardDataService {
  /**
   * Get study time statistics for a user
   */
  async getStudyTimeStats(userId: string): Promise<StudyTimeStats> {
    try {
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);

      // Get today's study time
      const { data: todayData, error: todayError } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lte('created_at', new Date().toISOString());

      if (todayError) {
        logger.error('Error fetching today study time:', todayError);
        throw todayError;
      }

      const todayMinutes = todayData?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;

      // Get this week's study time
      const { data: weekData, error: weekError } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString())
        .lte('created_at', new Date().toISOString());

      if (weekError) {
        logger.error('Error fetching week study time:', weekError);
        throw weekError;
      }

      const weekMinutes = weekData?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;

      // Get total study time
      const { data: totalData, error: totalError } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId);

      if (totalError) {
        logger.error('Error fetching total study time:', totalError);
        throw totalError;
      }

      const totalMinutes = totalData?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;

      return {
        today: todayMinutes,
        thisWeek: weekMinutes,
        total: totalMinutes,
      };
    } catch (error) {
      logger.error('Error in getStudyTimeStats:', error);
      throw error;
    }
  }

  /**
   * Get course statistics for a user
   */
  async getCourseStats(userId: string): Promise<CourseStats> {
    try {
      // Get course counts by status
      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id, status')
        .eq('user_id', userId);

      if (courseError) {
        logger.error('Error fetching courses:', courseError);
        throw courseError;
      }

      const active = courses?.filter(c => c.status === 'active').length || 0;
      const completed = courses?.filter(c => c.status === 'completed').length || 0;
      const archived = courses?.filter(c => c.status === 'archived').length || 0;

      // Get module statistics
      const courseIds = courses?.map(c => c.id) || [];
      
      if (courseIds.length === 0) {
        return {
          active,
          completed,
          archived,
          totalModules: 0,
          completedModules: 0,
        };
      }

      const { data: modules, error: moduleError } = await supabase
        .from('modules')
        .select('id, completion_status')
        .in('course_id', courseIds);

      if (moduleError) {
        logger.error('Error fetching modules:', moduleError);
        throw moduleError;
      }

      const totalModules = modules?.length || 0;
      const completedModules = modules?.filter(m => m.completion_status === 'completed').length || 0;

      return {
        active,
        completed,
        archived,
        totalModules,
        completedModules,
      };
    } catch (error) {
      logger.error('Error in getCourseStats:', error);
      throw error;
    }
  }

  /**
   * Get recent user activities
   */
  async getRecentActivities(userId: string, limit: number = 10): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching recent activities:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getRecentActivities:', error);
      throw error;
    }
  }

  /**
   * Get study sessions for a date range
   */
  async getStudySessions(userId: string, startDate: Date, endDate: Date) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching study sessions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getStudySessions:', error);
      throw error;
    }
  }
}