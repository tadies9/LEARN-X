import { BaseApiService } from './BaseApiService';
import { API_CLIENT } from './client';

export interface DashboardStats {
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

export interface UserActivity {
  id: string;
  userId: string;
  type:
    | 'course_created'
    | 'module_completed'
    | 'file_uploaded'
    | 'study_session'
    | 'achievement_earned'
    | 'quiz_completed'
    | 'flashcard_practiced';
  metadata: Record<string, any>;
  timestamp: string;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  todayCompleted: boolean;
  daysThisWeek: number;
}

export interface CourseRecommendation {
  title: string;
  description: string;
  reason: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

class DashboardApiService extends BaseApiService {
  constructor() {
    super(API_CLIENT, '/dashboard');
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<{ status: string; data: DashboardStats }>(
      `${this.baseEndpoint}/stats`
    );
    return response.data.data;
  }

  /**
   * Get recent user activity
   */
  async getActivity(limit: number = 10): Promise<UserActivity[]> {
    const response = await this.client.get<{ status: string; data: UserActivity[] }>(
      `${this.baseEndpoint}/activity`,
      {
        params: { limit },
      }
    );
    return response.data.data;
  }

  /**
   * Get learning streak information
   */
  async getStreak(): Promise<StreakInfo> {
    const response = await this.client.get<{ status: string; data: StreakInfo }>(
      `${this.baseEndpoint}/streak`
    );
    return response.data.data;
  }

  /**
   * Get personalized course recommendations
   */
  async getRecommendations(): Promise<CourseRecommendation[]> {
    const response = await this.client.get<{ status: string; data: CourseRecommendation[] }>(
      `${this.baseEndpoint}/recommendations`
    );
    return response.data.data;
  }

  /**
   * Log a user activity
   */
  async logActivity(
    type: UserActivity['type'],
    metadata?: Record<string, any>
  ): Promise<UserActivity> {
    const response = await this.client.post<{ status: string; data: UserActivity }>(
      `${this.baseEndpoint}/activity`,
      {
        type,
        metadata,
      }
    );
    return response.data.data;
  }

  /**
   * Update user's learning streak
   */
  async updateStreak(): Promise<StreakInfo> {
    const response = await this.client.post<{ status: string; data: StreakInfo }>(
      `${this.baseEndpoint}/streak`
    );
    return response.data.data;
  }

  /**
   * Format study time for display
   */
  formatStudyTime(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours >= 100) {
      return `${Math.round(hours)}h`;
    }
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Get activity type display info
   */
  getActivityTypeInfo(type: UserActivity['type']): { label: string; icon: string; color: string } {
    const typeMap = {
      course_created: { label: 'Created course', icon: 'BookOpen', color: 'text-blue-600' },
      module_completed: { label: 'Completed module', icon: 'CheckCircle', color: 'text-green-600' },
      file_uploaded: { label: 'Uploaded file', icon: 'Upload', color: 'text-purple-600' },
      study_session: { label: 'Study session', icon: 'Clock', color: 'text-orange-600' },
      achievement_earned: { label: 'Earned achievement', icon: 'Trophy', color: 'text-yellow-600' },
      quiz_completed: { label: 'Completed quiz', icon: 'HelpCircle', color: 'text-indigo-600' },
      flashcard_practiced: {
        label: 'Practiced flashcards',
        icon: 'Layers',
        color: 'text-pink-600',
      },
    };

    return typeMap[type] || { label: type, icon: 'Activity', color: 'text-gray-600' };
  }
}

// Export singleton instance
export const dashboardApi = new DashboardApiService();
