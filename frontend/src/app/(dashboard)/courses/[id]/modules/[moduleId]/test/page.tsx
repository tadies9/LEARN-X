'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ModuleTestPage({ params }: { params: { id: string; moduleId: string } }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const startTime = Date.now();
      const result = await testFn();
      const endTime = Date.now();

      setResults((prev) => [
        ...prev,
        {
          testName,
          success: true,
          result,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setResults((prev) => [
        ...prev,
        {
          testName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAPI = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/modules/${params.moduleId}/files-debug`
    );
    return await response.json();
  };

  const testAuthenticatedAPI = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/modules/${params.moduleId}/files`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    return await response.json();
  };

  const testFileApiService = async () => {
    const { fileApi } = await import('@/lib/api/FileApiService');
    return await fileApi.getModuleFiles(params.moduleId);
  };

  const testModuleApiService = async () => {
    const { moduleApi } = await import('@/lib/api/ModuleApiService');
    return await moduleApi.getModuleFiles(params.moduleId);
  };

  const runAllTests = async () => {
    setResults([]);
    await runTest('Direct API (Debug Endpoint)', testDirectAPI);
    await runTest('Authenticated API', testAuthenticatedAPI);
    await runTest('FileApiService', testFileApiService);
    await runTest('ModuleApiService', testModuleApiService);
  };

  useEffect(() => {
    runAllTests();
  }, [params.moduleId]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Module Files API Test</CardTitle>
          <div className="text-sm text-muted-foreground">Module ID: {params.moduleId}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runAllTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>

          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={index} className={result.success ? 'border-green-500' : 'border-red-500'}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {result.testName} {result.success ? '✅' : '❌'}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {result.timestamp} {result.duration && `(${result.duration}ms)`}
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto max-h-64 bg-gray-100 p-2 rounded">
                    {JSON.stringify(
                      result.success ? result.result : { error: result.error },
                      null,
                      2
                    )}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
