'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Download, FileJson, FileText, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { personaApi } from '@/lib/api/persona';
import { useToast } from '@/components/ui/use-toast';
import { PersonaDisplay } from '@/components/settings/PersonaDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PersonaSettings() {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      await personaApi.exportPersona(format);
      toast({
        title: 'Export successful',
        description: `Your persona has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export persona. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRetakeOnboarding = () => {
    router.push('/onboarding');
  };

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Your Profile</TabsTrigger>
        <TabsTrigger value="manage">Manage & Export</TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile" className="space-y-6">
        <PersonaDisplay />
      </TabsContent>
      
      <TabsContent value="manage" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Your Learning Profile</CardTitle>
            <CardDescription>
              Download your personalized learning profile data in different formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => handleExport('json')} disabled={exporting}>
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </Button>
              <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your exported data includes all your preferences, learning style, and personalization
              settings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Your Profile</CardTitle>
            <CardDescription>
              Want to update your learning preferences or try different settings?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRetakeOnboarding}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake Onboarding
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              This will guide you through the personalization process again, allowing you to update
              your preferences.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & Data</CardTitle>
            <CardDescription>Your persona data is private and secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p>• Your learning profile is stored securely and never shared with third parties</p>
              <p>• We use your preferences solely to personalize your learning experience</p>
              <p>• You can export or delete your data at any time</p>
              <p>• All data is encrypted in transit and at rest</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
