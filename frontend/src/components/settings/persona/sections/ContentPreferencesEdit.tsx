import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { CONTENT_DENSITY_OPTIONS } from '../types';
import type { ContentPreferencesData } from '../types';

interface ContentPreferencesEditProps {
  data: ContentPreferencesData;
  onChange: (data: ContentPreferencesData) => void;
}

export function ContentPreferencesEdit({ data, onChange }: ContentPreferencesEditProps) {
  return (
    <>
      <div>
        <Label htmlFor="density">Content Density</Label>
        <Select
          value={data.density || ''}
          onValueChange={(value) => onChange({ ...data, density: value })}
        >
          <SelectTrigger id="density">
            <SelectValue placeholder="Select density" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_DENSITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="detail">Detail Tolerance</Label>
        <Select
          value={data.detailTolerance || ''}
          onValueChange={(value) => onChange({ ...data, detailTolerance: value })}
        >
          <SelectTrigger id="detail">
            <SelectValue placeholder="Select detail level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low - Quick and simple</SelectItem>
            <SelectItem value="medium">Medium - Balanced detail</SelectItem>
            <SelectItem value="high">High - Deep dives welcome</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="repetition">Repetition Preference</Label>
        <Select
          value={data.repetitionPreference || ''}
          onValueChange={(value) => onChange({ ...data, repetitionPreference: value })}
        >
          <SelectTrigger id="repetition">
            <SelectValue placeholder="Select repetition level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minimal">Minimal - Once is enough</SelectItem>
            <SelectItem value="moderate">Moderate - Key points repeated</SelectItem>
            <SelectItem value="frequent">Frequent - Multiple reinforcements</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
