'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, PlayCircle, Trophy, Clock, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface Module {
  id: string;
  title: string;
  duration: string;
  status: 'completed' | 'in-progress' | 'locked';
  lessons: {
    id: string;
    title: string;
    completed: boolean;
  }[];
}

interface ProgressTrackerProps {
  courseTitle: string;
  totalProgress: number;
  modules: Module[];
  currentModuleId?: string;
  onModuleSelect?: (moduleId: string) => void;
}

export function ProgressTracker({
  courseTitle,
  totalProgress,
  modules,
  currentModuleId,
  onModuleSelect,
}: ProgressTrackerProps) {
  const completedModules = modules.filter((m) => m.status === 'completed').length;
  const completedLessons = modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.completed).length,
    0
  );

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">{courseTitle}</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-medium">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-5 w-5 text-warning" />
            </div>
            <p className="text-2xl font-bold">{completedModules}</p>
            <p className="text-xs text-muted-foreground">Modules Done</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{completedLessons}</p>
            <p className="text-xs text-muted-foreground">Lessons Done</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <p className="text-2xl font-bold">
              {modules.reduce((acc, m) => acc + parseInt(m.duration), 0)}h
            </p>
            <p className="text-xs text-muted-foreground">Total Time</p>
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Course Modules</h4>
          {modules.map((module, index) => {
            const isActive = module.id === currentModuleId;
            const completedCount = module.lessons.filter((l) => l.completed).length;
            const progressPercent = (completedCount / module.lessons.length) * 100;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start p-4 h-auto"
                  onClick={() => onModuleSelect?.(module.id)}
                  disabled={module.status === 'locked'}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5">
                      {module.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : module.status === 'in-progress' ? (
                        <PlayCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{module.title}</p>
                        {module.status === 'in-progress' && (
                          <Badge variant="secondary" className="text-xs">
                            In Progress
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{module.lessons.length} lessons</span>
                        <span>{module.duration}</span>
                      </div>
                      {module.status !== 'locked' && (
                        <div className="mt-2">
                          <Progress value={progressPercent} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Achievement */}
        {totalProgress === 100 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg p-4 text-center"
          >
            <Trophy className="h-12 w-12 text-warning mx-auto mb-2" />
            <h4 className="font-semibold">Course Completed!</h4>
            <p className="text-sm text-muted-foreground">
              Congratulations on finishing this course!
            </p>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
