'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface PerformanceData {
  month: string;
  score: number;
}

interface PerformanceTabProps {
  performanceData: PerformanceData[];
  improvement: number;
}

export function PerformanceTab({ performanceData, improvement }: PerformanceTabProps) {
  return (
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
              Your scores have improved by {improvement}% over the past 4 months. 
              Keep up the excellent work!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}