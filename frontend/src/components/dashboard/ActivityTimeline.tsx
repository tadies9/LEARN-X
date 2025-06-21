'use client';

import { Card } from '@/components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Target, MessageSquare, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const iconMap = {
  course: BookOpen,
  achievement: Trophy,
  goal: Target,
  comment: MessageSquare,
  assignment: FileText,
  complete: CheckCircle,
};

interface Activity {
  id: string;
  type: keyof typeof iconMap;
  title: string;
  description: string;
  time: Date;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4"
            >
              <div className="relative">
                <div
                  className={`rounded-full p-2 ${
                    activity.type === 'achievement'
                      ? 'bg-warning/10 text-warning'
                      : activity.type === 'complete'
                        ? 'bg-success/10 text-success'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-border" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  {activity.user && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback>
                        {activity.user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(activity.time, 'MMM d, h:mm a')}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
