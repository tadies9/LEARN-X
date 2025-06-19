// Removed unused import '../../utils/logger';
import { differenceInDays, startOfDay, format } from 'date-fns';

interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  todayCompleted: boolean;
  daysThisWeek: number;
}

interface ProgressStats {
  overallCompletion: number;
  weeklyGoalProgress: number;
  masteredConcepts: number;
}

interface StudySession {
  created_at: string;
  duration: number;
}

interface WeeklyPattern {
  dayOfWeek: string;
  averageMinutes: number;
  sessions: number;
}

/**
 * Service for aggregating and calculating dashboard metrics
 * Focuses on business logic and calculations
 */
export class DashboardAggregationService {
  /**
   * Calculate streak information from study sessions
   */
  calculateStreakInfo(sessions: StudySession[]): StreakInfo {
    if (!sessions || sessions.length === 0) {
      return {
        current: 0,
        longest: 0,
        lastActiveDate: null,
        todayCompleted: false,
        daysThisWeek: 0,
      };
    }

    // Sort sessions by date (newest first)
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const today = startOfDay(new Date());
    const uniqueDays = new Set<string>();
    const weekDays = new Set<string>();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get unique days with activity
    sortedSessions.forEach(session => {
      const sessionDate = startOfDay(new Date(session.created_at));
      const dateStr = format(sessionDate, 'yyyy-MM-dd');
      uniqueDays.add(dateStr);

      // Track days this week
      if (sessionDate >= weekAgo) {
        weekDays.add(dateStr);
      }
    });

    // Convert to sorted array of dates
    const activeDays = Array.from(uniqueDays)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    if (activeDays.length === 0) {
      return {
        current: 0,
        longest: 0,
        lastActiveDate: null,
        todayCompleted: false,
        daysThisWeek: weekDays.size,
      };
    }

    // Calculate current streak
    let currentStreak = 0;
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayCompleted = uniqueDays.has(todayStr);

    // Start from today or yesterday depending on today's completion
    let checkDate = todayCompleted ? today : new Date(today);
    if (!todayCompleted) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days backwards
    for (const activeDay of activeDays) {
      const checkStr = format(checkDate, 'yyyy-MM-dd');
      const activeStr = format(activeDay, 'yyyy-MM-dd');

      if (checkStr === activeStr) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (currentStreak > 0) {
        // Streak broken
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (let i = 0; i < activeDays.length; i++) {
      const currentDate = activeDays[i];

      if (lastDate === null) {
        tempStreak = 1;
      } else {
        const daysDiff = differenceInDays(lastDate, currentDate);
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      lastDate = currentDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      current: currentStreak,
      longest: Math.max(currentStreak, longestStreak),
      lastActiveDate: format(activeDays[0], 'yyyy-MM-dd'),
      todayCompleted,
      daysThisWeek: weekDays.size,
    };
  }

  /**
   * Calculate progress statistics
   */
  calculateProgressStats(
    totalModules: number,
    completedModules: number,
    weeklyGoalMinutes: number,
    weeklyActualMinutes: number,
    masteredConceptsCount: number
  ): ProgressStats {
    const overallCompletion = totalModules > 0 
      ? Math.round((completedModules / totalModules) * 100) 
      : 0;

    const weeklyGoalProgress = weeklyGoalMinutes > 0
      ? Math.min(100, Math.round((weeklyActualMinutes / weeklyGoalMinutes) * 100))
      : 0;

    return {
      overallCompletion,
      weeklyGoalProgress,
      masteredConcepts: masteredConceptsCount,
    };
  }

  /**
   * Calculate weekly study patterns
   */
  calculateWeeklyPatterns(sessions: StudySession[]): WeeklyPattern[] {
    const patterns: Record<string, { totalMinutes: number; count: number }> = {
      Mon: { totalMinutes: 0, count: 0 },
      Tue: { totalMinutes: 0, count: 0 },
      Wed: { totalMinutes: 0, count: 0 },
      Thu: { totalMinutes: 0, count: 0 },
      Fri: { totalMinutes: 0, count: 0 },
      Sat: { totalMinutes: 0, count: 0 },
      Sun: { totalMinutes: 0, count: 0 },
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    sessions.forEach(session => {
      const date = new Date(session.created_at);
      const dayName = dayNames[date.getDay()];
      
      if (patterns[dayName]) {
        patterns[dayName].totalMinutes += session.duration || 0;
        patterns[dayName].count += 1;
      }
    });

    return Object.entries(patterns).map(([dayOfWeek, data]) => ({
      dayOfWeek,
      averageMinutes: data.count > 0 ? Math.round(data.totalMinutes / data.count) : 0,
      sessions: data.count,
    }));
  }

  /**
   * Calculate learning velocity (concepts mastered per week)
   */
  calculateLearningVelocity(
    masteredConcepts: Array<{ mastered_at: string }>,
    weeksToConsider: number = 4
  ): number {
    if (!masteredConcepts || masteredConcepts.length === 0) {
      return 0;
    }

    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeksToConsider * 7));

    const recentConcepts = masteredConcepts.filter(
      concept => new Date(concept.mastered_at) >= weeksAgo
    );

    return recentConcepts.length / weeksToConsider;
  }

  /**
   * Calculate consistency score (0-100)
   */
  calculateConsistencyScore(
    sessions: StudySession[],
    targetDaysPerWeek: number = 5
  ): number {
    if (!sessions || sessions.length === 0) {
      return 0;
    }

    // Look at the last 4 weeks
    const weeksToAnalyze = 4;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeksToAnalyze * 7));

    // Group sessions by week
    const weeklyActivity: Record<string, Set<string>> = {};
    
    sessions
      .filter(session => new Date(session.created_at) >= startDate)
      .forEach(session => {
        const sessionDate = new Date(session.created_at);
        const weekStart = new Date(sessionDate);
        weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weeklyActivity[weekKey]) {
          weeklyActivity[weekKey] = new Set();
        }
        
        weeklyActivity[weekKey].add(format(sessionDate, 'yyyy-MM-dd'));
      });

    // Calculate average days per week
    const weekKeys = Object.keys(weeklyActivity);
    if (weekKeys.length === 0) {
      return 0;
    }

    const totalDays = weekKeys.reduce(
      (sum, week) => sum + weeklyActivity[week].size,
      0
    );
    const avgDaysPerWeek = totalDays / weekKeys.length;

    // Calculate consistency score
    const consistency = Math.min(100, Math.round((avgDaysPerWeek / targetDaysPerWeek) * 100));
    
    return consistency;
  }
}