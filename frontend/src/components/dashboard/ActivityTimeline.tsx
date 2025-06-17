'use client';

import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Trophy, 
  Upload, 
  Clock, 
  CheckCircle, 
  HelpCircle, 
  Layers,
  Activity as ActivityIcon 
} from 'lucide-react';
import { format } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserActivity } from '@/lib/api/DashboardApiService';

const iconMap = {
  course_created: BookOpen,
  module_completed: CheckCircle,
  file_uploaded: Upload,
  study_session: Clock,
  achievement_earned: Trophy,
  quiz_completed: HelpCircle,
  flashcard_practiced: Layers,
  default: ActivityIcon,
};

const colorMap = {
  course_created: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20',
  module_completed: 'bg-green-100 text-green-600 dark:bg-green-900/20',
  file_uploaded: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20',
  study_session: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20',
  achievement_earned: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20',
  quiz_completed: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20',
  flashcard_practiced: 'bg-pink-100 text-pink-600 dark:bg-pink-900/20',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-900/20',
};

interface ActivityTimelineProps {
  activities: UserActivity[];
}

const getActivityDetails = (activity: UserActivity) => {
  const typeLabels = {
    course_created: 'Created course',
    module_completed: 'Completed module',
    file_uploaded: 'Uploaded file',
    study_session: 'Study session',
    achievement_earned: 'Earned achievement',
    quiz_completed: 'Completed quiz',
    flashcard_practiced: 'Practiced flashcards',
  };

  const title = typeLabels[activity.type as keyof typeof typeLabels] || activity.type;
  
  // Build description from metadata
  let description = '';
  if (activity.metadata) {
    if (activity.metadata.courseName) {
      description = activity.metadata.courseName;
    } else if (activity.metadata.fileName) {
      description = activity.metadata.fileName;
    } else if (activity.metadata.duration) {
      description = `${Math.round(activity.metadata.duration / 60)} minutes`;
    } else if (activity.metadata.score) {
      description = `Score: ${activity.metadata.score}%`;
    }
  }

  return { title, description };
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <ActivityIcon className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No recent activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start learning to see your progress here!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type as keyof typeof iconMap] || iconMap.default;
          const colorClass = colorMap[activity.type as keyof typeof colorMap] || colorMap.default;
          const { title, description } = getActivityDetails(activity);
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4"
            >
              <div className="relative">
                <div className={`rounded-full p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-border" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{title}</p>
                    {description && (
                      <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
