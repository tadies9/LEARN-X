import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit, Save, X } from 'lucide-react';

interface PersonaSectionProps {
  title: string;
  icon: ReactNode;
  isEditing: boolean;
  isUpdating?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
  editContent?: ReactNode;
}

export function PersonaSection({
  title,
  icon,
  isEditing,
  isUpdating = false,
  onEdit,
  onSave,
  onCancel,
  children,
  editContent,
}: PersonaSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            {editContent}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={onSave} disabled={isUpdating}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
