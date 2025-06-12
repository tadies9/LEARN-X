'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FolderPlus } from 'lucide-react';

interface EmptyModulesProps {
  onCreateModule: () => void;
}

export function EmptyModules({ onCreateModule }: EmptyModulesProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FolderPlus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No modules yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Modules help you organize your course content into logical sections. Create your first
          module to start adding learning materials.
        </p>
        <Button onClick={onCreateModule}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Create First Module
        </Button>
      </CardContent>
    </Card>
  );
}
