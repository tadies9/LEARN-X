import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { INTEREST_CATEGORIES, LEARNING_TOPICS } from '@/lib/types/persona';
import type { InterestsData } from '../types';

interface InterestsEditProps {
  data: InterestsData;
  onChange: (data: InterestsData) => void;
}

export function InterestsEdit({ data, onChange }: InterestsEditProps) {
  const handleInterestToggle = (
    category: 'primary' | 'secondary' | 'learningTopics',
    value: string
  ) => {
    const currentItems = data[category] || [];
    const newItems = currentItems.includes(value)
      ? currentItems.filter((item: string) => item !== value)
      : [...currentItems, value];

    onChange({ ...data, [category]: newItems });
  };

  const allInterests = Object.entries(INTEREST_CATEGORIES).flatMap(([_, items]) => items);

  return (
    <>
      <div>
        <Label>Primary Interests (Max 5)</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Click interests to select them. These will be used as primary examples.
        </p>
        <div className="flex flex-wrap gap-2">
          {allInterests.map((interest) => (
            <Badge
              key={interest}
              variant={data.primary?.includes(interest) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (data.primary?.includes(interest) || (data.primary?.length || 0) < 5) {
                  handleInterestToggle('primary', interest);
                }
              }}
            >
              {interest}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <Label>Secondary Interests (Max 5)</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {allInterests
            .filter((interest) => !data.primary?.includes(interest))
            .map((interest) => (
              <Badge
                key={interest}
                variant={data.secondary?.includes(interest) ? 'secondary' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  if (data.secondary?.includes(interest) || (data.secondary?.length || 0) < 5) {
                    handleInterestToggle('secondary', interest);
                  }
                }}
              >
                {interest}
              </Badge>
            ))}
        </div>
      </div>
      <div>
        <Label>Learning Topics (Max 10)</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Select the subjects and skills you want to learn about
        </p>
        <div className="flex flex-wrap gap-2">
          {LEARNING_TOPICS.map((topic) => (
            <Badge
              key={topic}
              variant={data.learningTopics?.includes(topic) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (
                  data.learningTopics?.includes(topic) ||
                  (data.learningTopics?.length || 0) < 10
                ) {
                  handleInterestToggle('learningTopics', topic);
                }
              }}
            >
              {topic}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}
