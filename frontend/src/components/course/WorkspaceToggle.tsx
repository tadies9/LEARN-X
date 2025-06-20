'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function WorkspaceToggle() {
  const { toast } = useToast();
  const [useNewWorkspace, setUseNewWorkspace] = useState(false);

  useEffect(() => {
    // Load preference from localStorage
    const stored = localStorage.getItem('useNewWorkspace');
    setUseNewWorkspace(stored === 'true');
  }, []);

  const handleToggle = (checked: boolean) => {
    setUseNewWorkspace(checked);
    localStorage.setItem('useNewWorkspace', checked.toString());

    toast({
      title: checked ? 'New Workspace Enabled' : 'Classic Mode Enabled',
      description: checked
        ? 'Files will open in the streamlined workspace'
        : 'Files will open in the classic personalization page',
    });
  };

  return (
    <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50">
      <Sparkles className="h-4 w-4 text-purple-600" />
      <Switch
        id="global-workspace-toggle"
        checked={useNewWorkspace}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="global-workspace-toggle" className="text-sm cursor-pointer">
        New Workspace
      </Label>
    </div>
  );
}
