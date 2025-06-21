'use client';

import { useEffect, useState } from 'react';
import { fileApi } from '@/lib/api/FileApiService';
import { moduleApi } from '@/lib/api/ModuleApiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ModuleDebugPage({ params }: { params: { id: string; moduleId: string } }) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        console.log('Debug: Loading data for module:', params.moduleId);

        // Get module info
        const module = await moduleApi.getModule(params.moduleId);
        console.log('Debug: Module data:', module);

        // Get module files
        const files = await fileApi.getModuleFiles(params.moduleId);
        console.log('Debug: Files data:', files);

        // Make a direct API call to see raw response
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/modules/${params.moduleId}/files`,
          {
            headers: {
              Authorization: `Bearer ${(await import('@/lib/supabase/client'))
                .createClient()
                .auth.getSession()
                .then((s) => s.data.session?.access_token)}`,
            },
          }
        );
        const rawData = await response.json();
        console.log('Debug: Raw API response:', rawData);

        setDebugInfo({
          moduleId: params.moduleId,
          courseId: params.id,
          module,
          filesFromApi: files,
          filesCount: files?.length || 0,
          rawApiResponse: rawData,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Debug: Error loading data:', error);
        setDebugInfo({
          error: error instanceof Error ? error.message : 'Unknown error',
          moduleId: params.moduleId,
          courseId: params.id,
        });
      } finally {
        setLoading(false);
      }
    };

    loadDebugInfo();
  }, [params.id, params.moduleId]);

  if (loading) {
    return <div className="container mx-auto py-8">Loading debug info...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Module Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Files Summary:</h3>
            <ul className="list-disc list-inside">
              {debugInfo.filesFromApi?.map((file: any) => (
                <li key={file.id}>
                  {file.name} (Module: {file.moduleId})
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
