'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  Timer as TimerIcon,
  Coffee,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyTimerProps {
  onSessionComplete?: (duration: number, type: 'study' | 'break') => void;
}

interface TimerSettings {
  studyDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartStudy: boolean;
  playNotifications: boolean;
}

const DEFAULT_SETTINGS: TimerSettings = {
  studyDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartStudy: false,
  playNotifications: true,
};

export function StudyTimer({ onSessionComplete }: StudyTimerProps) {
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [timeLeft, setTimeLeft] = useState(settings.studyDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<'study' | 'short-break' | 'long-break'>(
    'study'
  );
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  const intervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>();

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      completeSession();
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  // Update timer when settings change
  useEffect(() => {
    if (!isRunning) {
      resetTimer();
    }
  }, [settings, currentSession]);

  const startTimer = () => {
    setIsRunning(true);
    if (sessionStartTime === 0) {
      setSessionStartTime(Date.now());
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = () => {
    setIsRunning(false);
    resetTimer();
    setSessionStartTime(0);
  };

  const resetTimer = () => {
    const duration =
      currentSession === 'study'
        ? settings.studyDuration
        : currentSession === 'short-break'
          ? settings.shortBreakDuration
          : settings.longBreakDuration;

    setTimeLeft(duration * 60);
  };

  const completeSession = () => {
    setIsRunning(false);

    // Play notification sound
    if (settings.playNotifications && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Record session completion
    const duration = sessionStartTime > 0 ? Date.now() - sessionStartTime : 0;
    onSessionComplete?.(duration, currentSession === 'study' ? 'study' : 'break');

    if (currentSession === 'study') {
      setCompletedSessions((prev) => prev + 1);

      // Determine next session type
      const isLongBreakTime = (completedSessions + 1) % settings.sessionsUntilLongBreak === 0;
      const nextSession = isLongBreakTime ? 'long-break' : 'short-break';
      setCurrentSession(nextSession);

      // Auto-start break if enabled
      if (settings.autoStartBreaks) {
        setTimeout(() => {
          setSessionStartTime(Date.now());
          setIsRunning(true);
        }, 1000);
      }
    } else {
      setCurrentSession('study');

      // Auto-start study if enabled
      if (settings.autoStartStudy) {
        setTimeout(() => {
          setSessionStartTime(Date.now());
          setIsRunning(true);
        }, 1000);
      }
    }

    setSessionStartTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = (): number => {
    return currentSession === 'study'
      ? settings.studyDuration * 60
      : currentSession === 'short-break'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;
  };

  const getProgress = (): number => {
    const total = getTotalDuration();
    return ((total - timeLeft) / total) * 100;
  };

  const getSessionIcon = () => {
    switch (currentSession) {
      case 'study':
        return <Brain className="h-5 w-5" />;
      case 'short-break':
      case 'long-break':
        return <Coffee className="h-5 w-5" />;
    }
  };

  const getSessionColor = () => {
    switch (currentSession) {
      case 'study':
        return 'text-blue-600';
      case 'short-break':
        return 'text-green-600';
      case 'long-break':
        return 'text-purple-600';
    }
  };

  const getSessionName = () => {
    switch (currentSession) {
      case 'study':
        return 'Study Session';
      case 'short-break':
        return 'Short Break';
      case 'long-break':
        return 'Long Break';
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSessionIcon()}
              <span className={cn('font-medium', getSessionColor())}>{getSessionName()}</span>
            </div>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Timer Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="study-duration">Study Duration (min)</Label>
                      <Input
                        id="study-duration"
                        type="number"
                        min="1"
                        max="120"
                        value={settings.studyDuration}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSettings((prev) => ({
                            ...prev,
                            studyDuration: parseInt(e.target.value) || 25,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="short-break">Short Break (min)</Label>
                      <Input
                        id="short-break"
                        type="number"
                        min="1"
                        max="30"
                        value={settings.shortBreakDuration}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSettings((prev) => ({
                            ...prev,
                            shortBreakDuration: parseInt(e.target.value) || 5,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="long-break">Long Break (min)</Label>
                      <Input
                        id="long-break"
                        type="number"
                        min="1"
                        max="60"
                        value={settings.longBreakDuration}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSettings((prev) => ({
                            ...prev,
                            longBreakDuration: parseInt(e.target.value) || 15,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="sessions-until-long">Sessions until long break</Label>
                      <Input
                        id="sessions-until-long"
                        type="number"
                        min="2"
                        max="10"
                        value={settings.sessionsUntilLongBreak}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSettings((prev) => ({
                            ...prev,
                            sessionsUntilLongBreak: parseInt(e.target.value) || 4,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Auto-start breaks</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            autoStartBreaks: !prev.autoStartBreaks,
                          }))
                        }
                      >
                        {settings.autoStartBreaks ? 'On' : 'Off'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Auto-start study</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            autoStartStudy: !prev.autoStartStudy,
                          }))
                        }
                      >
                        {settings.autoStartStudy ? 'On' : 'Off'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Sound notifications</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            playNotifications: !prev.playNotifications,
                          }))
                        }
                      >
                        {settings.playNotifications ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Timer Display */}
          <div className="text-center">
            <div className="text-4xl font-mono font-bold mb-2">{formatTime(timeLeft)}</div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          {/* Session Info */}
          <div className="text-center text-sm text-muted-foreground">
            <div>Session {completedSessions + 1}</div>
            <div>
              Next:{' '}
              {completedSessions % settings.sessionsUntilLongBreak ===
              settings.sessionsUntilLongBreak - 1
                ? 'Long break'
                : completedSessions % 2 === 0
                  ? 'Short break'
                  : 'Study session'}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button onClick={startTimer} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline" className="flex-1">
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}

            <Button variant="outline" onClick={stopTimer}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>

            <Button variant="outline" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Completed Sessions */}
          {completedSessions > 0 && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Completed Sessions</div>
              <div className="flex justify-center gap-1 mt-1">
                {Array.from({ length: completedSessions }, (_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-green-500" />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
