import { PersonaField } from './PersonaField';
import type {
  AcademicCareerData,
  InterestsData,
  LearningStyleData,
  CommunicationData,
  ContentPreferencesData,
} from './types';

export function AcademicCareerDisplay({ data }: { data: AcademicCareerData | null }) {
  if (!data) return null;
  return (
    <>
      <PersonaField label="Current Status" value={data.currentStatus} />
      <PersonaField label="Field of Study" value={data.fieldOfStudy} />
      <PersonaField label="Aspired Industry" value={data.aspiredIndustry} />
      <PersonaField
        label="Career Goals & Learning Objectives"
        value={data.careerGoalsLearningObjectives}
      />
    </>
  );
}

export function InterestsDisplay({ data }: { data: InterestsData | null }) {
  if (!data) return null;
  return (
    <>
      <PersonaField label="Primary Interests" value={data.primary} variant="default" />
      <PersonaField label="Secondary Interests" value={data.secondary} variant="secondary" />
      <PersonaField label="Learning Topics" value={data.learningTopics} variant="outline" />
    </>
  );
}

export function LearningStyleDisplay({ data }: { data: LearningStyleData | null }) {
  if (!data) return null;
  return (
    <>
      <PersonaField label="Primary Style" value={data.primary} />
      <PersonaField label="Secondary Style" value={data.secondary} />
      <PersonaField label="Preference Strength" value={data.preferenceStrength} />
    </>
  );
}

export function ContentPreferencesDisplay({ data }: { data: ContentPreferencesData | null }) {
  if (!data) return null;
  return (
    <>
      <PersonaField label="Content Density" value={data.density} isBadge />
      <PersonaField label="Detail Tolerance" value={data.detailTolerance} isBadge />
      <PersonaField label="Repetition Preference" value={data.repetitionPreference} isBadge />
    </>
  );
}

export function CommunicationDisplay({ data }: { data: CommunicationData | null }) {
  if (!data) return null;
  return (
    <>
      <PersonaField label="Tone" value={data.style} />
      <PersonaField label="Encouragement" value={data.encouragementLevel} isBadge />
      <PersonaField
        label="Humor"
        value={data.humorAppropriate ? 'Light humor welcome' : 'Keep it professional'}
      />
    </>
  );
}
