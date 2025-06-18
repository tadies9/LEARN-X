import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COMMUNICATION_STYLES, ENCOURAGEMENT_LEVELS } from '../types';
import type { CommunicationData } from '../types';

interface CommunicationEditProps {
  data: CommunicationData;
  onChange: (data: CommunicationData) => void;
}

export function CommunicationEdit({ data, onChange }: CommunicationEditProps) {
  return (
    <>
      <div>
        <Label htmlFor="comm-style">Tone and Style</Label>
        <Select
          value={data.style || ''}
          onValueChange={(value) => onChange({ ...data, style: value })}
        >
          <SelectTrigger id="comm-style">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {COMMUNICATION_STYLES.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="encouragement">Encouragement Level</Label>
        <Select
          value={data.encouragementLevel || ''}
          onValueChange={(value) => onChange({ ...data, encouragementLevel: value })}
        >
          <SelectTrigger id="encouragement">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            {ENCOURAGEMENT_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="humor">Include light humor?</Label>
        <Button
          type="button"
          variant={data.humorAppropriate ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ ...data, humorAppropriate: !data.humorAppropriate })}
        >
          {data.humorAppropriate ? 'Yes' : 'No'}
        </Button>
      </div>
    </>
  );
}
