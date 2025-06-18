import { Plus } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import type { Module } from '@/lib/types/course';

interface ModuleHeaderProps {
  module: Module;
  onUpload: () => void;
}

export function ModuleHeader({ module, onUpload }: ModuleHeaderProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{module.title}</CardTitle>
            {module.description && <CardDescription>{module.description}</CardDescription>}
          </div>
          <Button onClick={onUpload}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
