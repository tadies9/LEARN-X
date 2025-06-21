'use client';

import { Button } from '@/components/ui/Button';
import { UserProfile } from '../types/study';

interface StudyToolsProps {
  profile: UserProfile | null;
  onSaveProgress: () => void;
  onExportNotes: () => void;
  onCacheInfo: () => void;
}

export function StudyTools({
  profile,
  onSaveProgress,
  onExportNotes,
  onCacheInfo,
}: StudyToolsProps) {
  return (
    <div className="border-t px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSaveProgress}>
          Save Progress
        </Button>
        <Button variant="outline" size="sm" onClick={onExportNotes}>
          Export Notes
        </Button>
        <Button variant="outline" size="sm" onClick={onCacheInfo}>
          Cache Info
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        {profile?.persona?.interests && (
          <span>
            Personalized for your interests: {profile.persona.interests.slice(0, 3).join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
