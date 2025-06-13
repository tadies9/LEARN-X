'use client';

import { Calendar, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CalendarPage() {
  const events = [
    {
      id: 1,
      title: 'React Hooks Workshop',
      time: '10:00 AM',
      duration: '2 hours',
      type: 'Live Session',
      color: 'bg-blue-500',
    },
    {
      id: 2,
      title: 'JavaScript Quiz Due',
      time: '11:59 PM',
      duration: 'Deadline',
      type: 'Assignment',
      color: 'bg-red-500',
    },
    {
      id: 3,
      title: 'Study Group: Data Structures',
      time: '3:00 PM',
      duration: '1 hour',
      type: 'Study Group',
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Learning Calendar
        </h1>
        <p className="text-muted-foreground">
          Manage your study schedule and track important deadlines
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>December 2024</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium p-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 6 + 1;
                  const isCurrentMonth = day > 0 && day <= 31;
                  const isToday = day === 13;
                  const hasEvent = [13, 15, 20].includes(day);
                  
                  return (
                    <div
                      key={i}
                      className={`aspect-square p-2 text-center text-sm border rounded-md cursor-pointer hover:bg-muted ${
                        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                      } ${isToday ? 'bg-primary text-primary-foreground' : ''} ${
                        hasEvent ? 'ring-2 ring-primary/20' : ''
                      }`}
                    >
                      {isCurrentMonth ? day : ''}
                      {hasEvent && isCurrentMonth && (
                        <div className="w-1 h-1 bg-primary rounded-full mx-auto mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Events & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Today's Events</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <CardDescription>December 13, 2024</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full mt-1 ${event.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.time} • {event.duration}
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">This Week</span>
                <span className="text-sm font-medium">8 events</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Upcoming Deadlines</span>
                <span className="text-sm font-medium text-red-600">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Study Hours Planned</span>
                <span className="text-sm font-medium">24h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}