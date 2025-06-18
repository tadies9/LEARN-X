'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar } from 'lucide-react';

import { getGradeBadgeVariant, getGradeColor } from '../utils/gradeHelpers';

interface CourseGrade {
  id: number;
  course: string;
  grade: string;
  percentage: number;
  assignments: number;
  completed: number;
  lastActivity: string;
  color: string;
}

interface CourseGradesTabProps {
  courseGrades: CourseGrade[];
}

export function CourseGradesTab({ courseGrades }: CourseGradesTabProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {courseGrades.map((course) => (
        <Card key={course.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{course.course}</CardTitle>
              <Badge variant={getGradeBadgeVariant(course.percentage)}>{course.grade}</Badge>
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
  );
}
