'use client';

import { useState } from 'react';

import { ClipboardList, Clock, CheckCircle, AlertCircle, Calendar, FileText, Upload } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AssignmentsPage() {
  const [selectedTab, setSelectedTab] = useState('pending');

  const assignments = [
    {
      id: 1,
      title: 'JavaScript Fundamentals Quiz',
      course: 'Web Development Basics',
      type: 'Quiz',
      dueDate: '2024-12-15',
      dueTime: '11:59 PM',
      status: 'pending',
      priority: 'high',
      points: 50,
      timeEstimate: '30 min',
      description: 'Complete the quiz covering variables, functions, and basic DOM manipulation.',
    },
    {
      id: 2,
      title: 'React Component Assignment',
      course: 'Advanced React',
      type: 'Project',
      dueDate: '2024-12-18',
      dueTime: '11:59 PM',
      status: 'in-progress',
      priority: 'medium',
      points: 100,
      timeEstimate: '3 hours',
      description: 'Build a reusable React component with props, state, and event handling.',
    },
    {
      id: 3,
      title: 'Database Design Exercise',
      course: 'Database Fundamentals',
      type: 'Exercise',
      dueDate: '2024-12-20',
      dueTime: '11:59 PM',
      status: 'pending',
      priority: 'low',
      points: 75,
      timeEstimate: '2 hours',
      description: 'Design an entity-relationship diagram for a library management system.',
    },
    {
      id: 4,
      title: 'CSS Layout Challenge',
      course: 'Web Development Basics',
      type: 'Project',
      dueDate: '2024-12-10',
      dueTime: '11:59 PM',
      status: 'completed',
      priority: 'medium',
      points: 80,
      timeEstimate: '2.5 hours',
      description: 'Create a responsive layout using CSS Grid and Flexbox.',
      submittedDate: '2024-12-09',
      grade: 85,
    },
    {
      id: 5,
      title: 'Algorithm Analysis',
      course: 'Computer Science Fundamentals',
      type: 'Written',
      dueDate: '2024-12-08',
      dueTime: '11:59 PM',
      status: 'overdue',
      priority: 'high',
      points: 60,
      timeEstimate: '1.5 hours',
      description: 'Analyze time complexity of given algorithms and provide Big O notation.',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <ClipboardList className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (selectedTab === 'pending') return assignment.status === 'pending' || assignment.status === 'in-progress';
    if (selectedTab === 'completed') return assignment.status === 'completed';
    if (selectedTab === 'overdue') return assignment.status === 'overdue';
    return true;
  });

  const pendingCount = assignments.filter(a => a.status === 'pending' || a.status === 'in-progress').length;
  const overdueCount = assignments.filter(a => a.status === 'overdue').length;
  const completedCount = assignments.filter(a => a.status === 'completed').length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-primary" />
          My Assignments
        </h1>
        <p className="text-muted-foreground">
          Track your assignments, deadlines, and submissions
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-blue-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueCount})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(assignment.status)}
                        <h3 className="font-semibold text-lg">{assignment.title}</h3>
                        <Badge variant="outline">{assignment.type}</Badge>
                        <Badge className={getPriorityColor(assignment.priority)}>
                          {assignment.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Course: {assignment.course}
                      </p>
                      <p className="text-sm mb-3">{assignment.description}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {assignment.dueDate} at {assignment.dueTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {assignment.timeEstimate}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {assignment.points} points
                        </div>
                      </div>

                      {assignment.status === 'completed' && assignment.grade && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            ✅ Submitted on {assignment.submittedDate} | Grade: {assignment.grade}/{assignment.points}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </Badge>
                      {assignment.status !== 'completed' && (
                        <Button size="sm">
                          {assignment.status === 'in-progress' ? (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Submit
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-1" />
                              Start
                            </>
                          )}
                        </Button>
                      )}
                    </div>
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