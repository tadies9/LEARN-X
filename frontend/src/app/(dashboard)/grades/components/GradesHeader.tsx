'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Award, FileText } from 'lucide-react';

interface OverallGrades {
  gpa: number;
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number;
  improvement: number;
}

interface GradesHeaderProps {
  overallGrades: OverallGrades;
}

export function GradesHeader({ overallGrades }: GradesHeaderProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall GPA</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallGrades.gpa}</div>
          <p className="text-xs text-muted-foreground">
            +{overallGrades.improvement}% from last semester
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallGrades.totalAssignments}</div>
          <p className="text-xs text-muted-foreground">
            {overallGrades.completedAssignments} completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallGrades.averageScore}%</div>
          <p className="text-xs text-muted-foreground">
            Across all courses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Improvement</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{overallGrades.improvement}%</div>
          <p className="text-xs text-muted-foreground">
            Over past 4 months
          </p>
        </CardContent>
      </Card>
    </div>
  );
}