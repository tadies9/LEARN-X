import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { INDUSTRIES } from '@/lib/types/persona';
import type { AcademicCareerData } from '../types';

interface AcademicCareerEditProps {
  data: AcademicCareerData;
  onChange: (data: AcademicCareerData) => void;
}

export function AcademicCareerEdit({ data, onChange }: AcademicCareerEditProps) {
  return (
    <>
      <div>
        <Label htmlFor="currentStatus">Current Status</Label>
        <Input
          id="currentStatus"
          value={data.currentStatus || ''}
          onChange={(e) => onChange({ ...data, currentStatus: e.target.value })}
          placeholder="e.g., Computer Science Student, High School Senior"
        />
      </div>
      <div>
        <Label htmlFor="fieldOfStudy">Field of Study</Label>
        <Input
          id="fieldOfStudy"
          value={data.fieldOfStudy || ''}
          onChange={(e) => onChange({ ...data, fieldOfStudy: e.target.value })}
          placeholder="e.g., Computer Science, Business Administration"
        />
      </div>
      <div>
        <Label htmlFor="aspiredIndustry">Aspired Industry</Label>
        <Select
          value={data.aspiredIndustry || ''}
          onValueChange={(value) => onChange({ ...data, aspiredIndustry: value })}
        >
          <SelectTrigger id="aspiredIndustry">
            <SelectValue placeholder="Select your desired industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="careerGoals">Career Goals & Learning Objectives</Label>
        <Textarea
          id="careerGoals"
          value={data.careerGoalsLearningObjectives || ''}
          onChange={(e) => onChange({ ...data, careerGoalsLearningObjectives: e.target.value })}
          placeholder="What are your career goals? What skills do you want to learn?"
          rows={4}
        />
      </div>
    </>
  );
}
