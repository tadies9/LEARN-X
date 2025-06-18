'use client';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { GradesHeader } from './components/GradesHeader';
import { CourseGradesTab } from './components/CourseGradesTab';
import { SubmissionsTab } from './components/SubmissionsTab';
import { PerformanceTab } from './components/PerformanceTab';
import { overallGrades, courseGrades, recentSubmissions, performanceData } from './data/mockData';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function GradesPage() {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Academic Progress</h1>
        <p className="text-muted-foreground">
          Track your performance across all courses and assignments
        </p>
      </div>

      <GradesHeader overallGrades={overallGrades} />

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Course Overview</TabsTrigger>
          <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CourseGradesTab courseGrades={courseGrades} />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <SubmissionsTab recentSubmissions={recentSubmissions} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <PerformanceTab
            performanceData={performanceData}
            improvement={overallGrades.improvement}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
