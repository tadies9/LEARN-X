'use client';

import { useState } from 'react';
import { useStudyMaterials } from '@/hooks/useStudyMaterials';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Clock, 
  Brain, 
  Target, 
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react';

export default function StudyPage() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const { materials, loading, error, refetch } = useStudyMaterials();


  const currentStudyStreak = 7;
  const todayStudyTime = 45; // minutes
  const weeklyGoal = 300; // minutes

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-blue-100 text-blue-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const startStudySession = (materialId: number) => {
    setActiveSession(materialId.toString());
    setSessionTime(0);
    // In real app, this would start the AI-powered study session
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          Study Sessions
        </h1>
        <p className="text-muted-foreground">
          AI-personalized study materials tailored to your learning style and interests
        </p>
      </div>

      {/* Study Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
                <p className="text-2xl font-bold text-orange-600">{currentStudyStreak} days</p>
              </div>
              <div className="text-2xl">🔥</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-blue-600">{formatTime(todayStudyTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weekly Goal</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((todayStudyTime / weeklyGoal) * 100)}%
                </p>
                <Progress 
                  value={(todayStudyTime / weeklyGoal) * 100} 
                  className="h-1 mt-2" 
                />
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Materials</TabsTrigger>
          <TabsTrigger value="ready">Ready to Study</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">Loading study materials...</div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={refetch} variant="outline">Retry</Button>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No study materials found.</p>
              <Button onClick={() => window.location.href = '/courses'} variant="outline">
                Upload Course Materials
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {materials.map((material) => (
              <Card key={material.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {material.title}
                        <Sparkles className="h-4 w-4 text-primary" />
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Personalized from: {material.originalSource}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(material.status)}>
                      {material.status === 'in-progress' ? 'In Progress' : 
                       material.status === 'completed' ? 'Completed' : 'Ready'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    {material.progress > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{material.progress}%</span>
                        </div>
                        <Progress value={material.progress} className="h-2" />
                      </div>
                    )}

                    {/* Personalization Info */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        🎯 Personalized for: {material.personalizedFor}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {material.aiFeatures.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Study Info */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {material.estimatedTime}
                        </span>
                        <Badge className={getDifficultyColor(material.difficulty)}>
                          {material.difficulty}
                        </Badge>
                      </div>
                      {material.lastStudied && (
                        <span>Last studied: {material.lastStudied}</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {material.status === 'completed' ? (
                        <Button variant="outline" className="flex-1">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1"
                          onClick={() => startStudySession(material.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {material.status === 'in-progress' ? 'Continue' : 'Start'} Study
                        </Button>
                      )}
                      <Button variant="outline" size="icon">
                        <Brain className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready">
          <div className="grid gap-6 lg:grid-cols-2">
            {materials
              .filter(m => m.status === 'ready')
              .map((material) => (
                <Card key={material.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{material.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ready to start • {material.estimatedTime}
                    </p>
                    <Button className="w-full">
                      <Zap className="h-4 w-4 mr-2" />
                      Start Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="in-progress">
          <div className="grid gap-6 lg:grid-cols-2">
            {materials
              .filter(m => m.status === 'in-progress')
              .map((material) => (
                <Card key={material.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{material.title}</h3>
                    <Progress value={material.progress} className="mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">
                      {material.progress}% complete • Last studied {material.lastStudied}
                    </p>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid gap-6 lg:grid-cols-2">
            {materials
              .filter(m => m.status === 'completed')
              .map((material) => (
                <Card key={material.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">{material.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Completed {material.lastStudied} • {material.estimatedTime}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                      <Button variant="outline" size="icon">
                        <Star className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}