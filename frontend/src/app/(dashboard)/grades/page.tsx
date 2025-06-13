'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Award, FileText, Clock, Calendar } from 'lucide-react';

export default function GradesPage() {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock data for grades and results
  const overallGrades = {
    gpa: 3.7,
    totalAssignments: 24,
    completedAssignments: 20,
    averageScore: 87,
    improvement: 12, // percentage improvement over time
  };

  const courseGrades = [
    {
      id: 1,
      course: 'JavaScript Fundamentals',
      grade: 'A-',
      percentage: 92,
      assignments: 8,
      completed: 8,
      lastActivity: '2024-12-10',
      color: 'bg-green-500',
    },
    {
      id: 2,
      course: 'React Development',
      grade: 'B+',
      percentage: 87,
      assignments: 6,
      completed: 5,
      lastActivity: '2024-12-12',
      color: 'bg-blue-500',
    },
    {
      id: 3,
      course: 'Database Design',
      grade: 'B',
      percentage: 83,
      assignments: 5,
      completed: 4,
      lastActivity: '2024-12-08',
      color: 'bg-yellow-500',
    },
    {
      id: 4,
      course: 'TypeScript Mastery',
      grade: 'B-',
      percentage: 80,
      assignments: 3,
      completed: 2,
      lastActivity: '2024-12-05',
      color: 'bg-purple-500',
    },
  ];

  const recentSubmissions = [
    {
      id: 1,
      title: 'React Hooks Assignment',
      course: 'React Development',
      submittedDate: '2024-12-12',
      gradeDate: '2024-12-13',
      score: 88,
      maxScore: 100,
      feedback: 'Excellent understanding of useState and useEffect. Consider adding error handling.',
      status: 'graded',
    },
    {
      id: 2,
      title: 'JavaScript Quiz #3',
      course: 'JavaScript Fundamentals',
      submittedDate: '2024-12-10',
      gradeDate: '2024-12-11',
      score: 95,
      maxScore: 100,
      feedback: 'Outstanding work! Perfect implementation of async/await patterns.',
      status: 'graded',
    },
    {
      id: 3,
      title: 'Database Schema Design',
      course: 'Database Design',
      submittedDate: '2024-12-08',
      gradeDate: '2024-12-09',
      score: 82,
      maxScore: 100,
      feedback: 'Good normalization. Could improve on index optimization strategies.',
      status: 'graded',
    },
    {
      id: 4,
      title: 'TypeScript Interfaces',
      course: 'TypeScript Mastery',
      submittedDate: '2024-12-13',
      gradeDate: null,
      score: null,
      maxScore: 75,
      feedback: null,
      status: 'pending',
    },
  ];

  const performanceData = [
    { month: 'Aug', score: 75 },
    { month: 'Sep', score: 78 },
    { month: 'Oct', score: 82 },
    { month: 'Nov', score: 85 },
    { month: 'Dec', score: 87 },
  ];

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return 'default';
    if (percentage >= 80) return 'secondary';
    return 'outline';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Grades & Results
        </h1>
        <p className="text-muted-foreground">
          View your academic performance and track your progress over time
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall GPA</p>
                <p className="text-3xl font-bold text-primary">{overallGrades.gpa}</p>
              </div>
              <Award className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold text-green-600">{overallGrades.averageScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assignments</p>
                <p className="text-3xl font-bold text-blue-600">
                  {overallGrades.completedAssignments}/{overallGrades.totalAssignments}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Improvement</p>
                <p className="text-3xl font-bold text-purple-600">+{overallGrades.improvement}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Course Overview</TabsTrigger>
          <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {courseGrades.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{course.course}</CardTitle>
                    <Badge variant={getGradeBadgeVariant(course.percentage)}>
                      {course.grade}
                    </Badge>
                  </div>
                  <CardDescription>
                    {course.completed}/{course.assignments} assignments completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Score</span>
                        <span className={`text-sm font-bold ${getGradeColor(course.percentage)}`}>
                          {course.percentage}%
                        </span>
                      </div>
                      <Progress value={course.percentage} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Last activity: {course.lastActivity}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {course.assignments - course.completed} pending
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <div className="space-y-4">
            {recentSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{submission.title}</h3>
                        <Badge variant="outline">{submission.course}</Badge>
                        <Badge 
                          variant={submission.status === 'graded' ? 'default' : 'secondary'}
                        >
                          {submission.status}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Submitted: {submission.submittedDate}
                          </span>
                          {submission.gradeDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Graded: {submission.gradeDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {submission.status === 'graded' ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Score:</span>
                              <span className={`text-lg font-bold ${getGradeColor((submission.score! / submission.maxScore) * 100)}`}>
                                {submission.score}/{submission.maxScore}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({Math.round((submission.score! / submission.maxScore) * 100)}%)
                              </span>
                            </div>
                          </div>
                          {submission.feedback && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm">
                                <strong>Feedback:</strong> {submission.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⏳ Waiting for grade (Max score: {submission.maxScore} points)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                Your average score trend over the past few months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Simple bar chart representation */}
                <div className="space-y-4">
                  {performanceData.map((data, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium">{data.month}</div>
                      <div className="flex-1">
                        <div className="bg-secondary rounded-full h-6 relative">
                          <div
                            className="bg-primary rounded-full h-6 flex items-center justify-end pr-2"
                            style={{ width: `${data.score}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {data.score}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Improving Performance!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your scores have improved by {overallGrades.improvement}% over the past 4 months. 
                    Keep up the excellent work!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}