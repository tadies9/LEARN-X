'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';

interface Submission {
  id: number;
  assignment: string;
  course: string;
  submitted: string;
  grade?: number;
  maxScore: number;
  status: 'graded' | 'pending' | 'late';
  feedback?: string;
}

interface SubmissionsTabProps {
  recentSubmissions: Submission[];
}

export function SubmissionsTab({ recentSubmissions }: SubmissionsTabProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'late':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'graded':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'late':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="grid gap-6">
      {recentSubmissions.map((submission) => (
        <Card key={submission.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{submission.assignment}</CardTitle>
                <CardDescription>{submission.course}</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(submission.status)}>{submission.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Submitted: {submission.submitted}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Status:{' '}
                  <span className={getStatusColor(submission.status)}>{submission.status}</span>
                </span>
              </div>

              {submission.grade !== undefined ? (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Score:</span>
                    <span className="text-lg font-bold text-green-700">
                      {submission.grade}/{submission.maxScore}
                    </span>
                  </div>
                  <div className="text-sm text-green-600">
                    Percentage: {Math.round((submission.grade / submission.maxScore) * 100)}%
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
