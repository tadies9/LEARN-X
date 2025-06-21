import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { LEARNING_STYLES } from '../types';
import type { LearningStyleData } from '../types';

interface LearningStyleEditProps {
  data: LearningStyleData;
  onChange: (data: LearningStyleData) => void;
}

export function LearningStyleEdit({ data, onChange }: LearningStyleEditProps) {
  return (
    <>
      <div>
        <Label htmlFor="primary-style">Primary Learning Style</Label>
        <Select
          value={data.primary || ''}
          onValueChange={(value) => onChange({ ...data, primary: value })}
        >
          <SelectTrigger id="primary-style">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {LEARNING_STYLES.map((style) => (
              <SelectItem key={style.id} value={style.id}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="secondary-style">Secondary Learning Style (Optional)</Label>
        <Select
          value={data.secondary || ''}
          onValueChange={(value) => onChange({ ...data, secondary: value })}
        >
          <SelectTrigger id="secondary-style">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {LEARNING_STYLES.filter((s) => s.id !== data.primary).map((style) => (
              <SelectItem key={style.id} value={style.id}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
