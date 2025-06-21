import { Badge } from '@/components/ui/Badge';

interface PersonaFieldProps {
  label: string;
  value?: string | string[] | number | boolean;
  variant?: 'default' | 'secondary' | 'outline';
  isBadge?: boolean;
}

export function PersonaField({
  label,
  value,
  variant = 'secondary',
  isBadge = false,
}: PersonaFieldProps) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  // Handle array values
  if (Array.isArray(value)) {
    return (
      <div>
        <span className="text-sm text-muted-foreground">{label}:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {value.map((item: string, i: number) => (
            <Badge key={i} variant={variant}>
              {item}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return (
      <div>
        <span className="text-sm text-muted-foreground">{label}:</span>
        <p className="font-medium">{value ? 'Yes' : 'No'}</p>
      </div>
    );
  }

  // Handle percentage values
  if (typeof value === 'number' && label.toLowerCase().includes('strength')) {
    return (
      <div>
        <span className="text-sm text-muted-foreground">{label}:</span>
        <p className="font-medium">{Math.round(value * 100)}%</p>
      </div>
    );
  }

  // Handle string values with badge option
  if (isBadge && typeof value === 'string') {
    return (
      <div>
        <span className="text-sm text-muted-foreground">{label}:</span>
        <Badge variant={variant} className="ml-2">
          {value}
        </Badge>
      </div>
    );
  }

  // Default string display
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <p
        className={
          label.includes('Goals') || label.includes('Objectives')
            ? 'text-sm mt-1'
            : 'font-medium capitalize'
        }
      >
        {typeof value === 'string' ? value.replace('_', ' ') : String(value)}
      </p>
    </div>
  );
}
