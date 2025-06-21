/**
 * API Connection Test Component
 * For testing all backend API connections
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { courseApi } from '@/lib/api/course';
import { personaApi } from '@/lib/api/persona';
import { notificationApi } from '@/lib/api/notification';
import { CheckCircle, XCircle, Loader2, Network, Database, User, Bell } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ApiTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runApiTests = async () => {
    setTesting(true);
    setResults([]);

    const tests: TestResult[] = [
      { name: 'Course API', status: 'pending', icon: Database },
      { name: 'Persona API', status: 'pending', icon: User },
      { name: 'Notification API', status: 'pending', icon: Bell },
    ];

    setResults([...tests]);

    // Test Course API
    try {
      await courseApi.getCourses({ page: 1, limit: 1 });
      updateResult('Course API', 'success', 'Successfully fetched courses');
    } catch (error) {
      updateResult(
        'Course API',
        'error',
        `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Test Persona API
    try {
      await personaApi.getPersona();
      updateResult('Persona API', 'success', 'Successfully fetched persona');
    } catch (error) {
      updateResult(
        'Persona API',
        'error',
        `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Test Notification API
    try {
      await notificationApi.getUnreadCount();
      updateResult('Notification API', 'success', 'Successfully fetched notification count');
    } catch (error) {
      updateResult(
        'Notification API',
        'error',
        `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    setTesting(false);
  };

  const updateResult = (name: string, status: 'success' | 'error', message: string) => {
    setResults((prev) =>
      prev.map((result) => (result.name === name ? { ...result, status, message } : result))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          API Connection Test
        </CardTitle>
        <CardDescription>Test connectivity to all backend APIs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runApiTests} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing APIs...
            </>
          ) : (
            'Run API Tests'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result) => {
              const Icon = result.icon;
              return (
                <div key={result.name} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      {result.status === 'pending' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {result.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {result.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    {result.message && (
                      <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      result.status === 'success'
                        ? 'default'
                        : result.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {result.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
