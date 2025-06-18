'use client';

import { GraduationCap, Heart, MessageSquare, FileText, Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonaSection } from './persona/PersonaSection';
import { usePersonaForm } from './persona/usePersonaForm';
import {
  AcademicCareerEdit,
  InterestsEdit,
  LearningStyleEdit,
  CommunicationEdit,
  ContentPreferencesEdit,
} from './persona/sections';
import {
  AcademicCareerDisplay,
  InterestsDisplay,
  LearningStyleDisplay,
  ContentPreferencesDisplay,
  CommunicationDisplay,
} from './persona/PersonaDisplay';
import type {
  AcademicCareerData,
  InterestsData,
  LearningStyleData,
  CommunicationData,
  ContentPreferencesData,
} from './persona/types';

export function EditablePersonaDisplay() {
  const {
    persona,
    isLoading,
    isUpdating,
    editingSection,
    editData,
    setEditData,
    getPersonaData,
    handleEdit,
    handleCancel,
    handleSave,
  } = usePersonaForm();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!persona) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No learning profile found. Complete the onboarding to personalize your experience.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Academic & Career Goals */}
      <PersonaSection
        title="Academic & Career Goals"
        icon={<GraduationCap className="h-5 w-5" />}
        isEditing={editingSection === 'academicCareer'}
        onEdit={() => handleEdit('academicCareer')}
        onSave={handleSave}
        onCancel={handleCancel}
        isUpdating={isUpdating}
        editContent={
          <AcademicCareerEdit
            data={editData as AcademicCareerData}
            onChange={(data) => setEditData(data)}
          />
        }
      >
        <AcademicCareerDisplay data={getPersonaData('academicCareer') as AcademicCareerData} />
      </PersonaSection>

      {/* Interests & Learning Goals */}
      <PersonaSection
        title="Interests & Learning Goals"
        icon={<Heart className="h-5 w-5" />}
        isEditing={editingSection === 'interests'}
        onEdit={() => handleEdit('interests')}
        onSave={handleSave}
        onCancel={handleCancel}
        isUpdating={isUpdating}
        editContent={
          <InterestsEdit data={editData as InterestsData} onChange={(data) => setEditData(data)} />
        }
      >
        <InterestsDisplay data={getPersonaData('interests') as InterestsData} />
      </PersonaSection>

      {/* Learning Style */}
      <PersonaSection
        title="Learning Style"
        icon={<Brain className="h-5 w-5" />}
        isEditing={editingSection === 'learningStyle'}
        onEdit={() => handleEdit('learningStyle')}
        onSave={handleSave}
        onCancel={handleCancel}
        isUpdating={isUpdating}
        editContent={
          <LearningStyleEdit
            data={editData as LearningStyleData}
            onChange={(data) => setEditData(data)}
          />
        }
      >
        <LearningStyleDisplay data={getPersonaData('learningStyle') as LearningStyleData} />
      </PersonaSection>

      {/* Content Preferences */}
      <PersonaSection
        title="Content Preferences"
        icon={<FileText className="h-5 w-5" />}
        isEditing={editingSection === 'contentPreferences'}
        onEdit={() => handleEdit('contentPreferences')}
        onSave={handleSave}
        onCancel={handleCancel}
        isUpdating={isUpdating}
        editContent={
          <ContentPreferencesEdit
            data={editData as ContentPreferencesData}
            onChange={(data) => setEditData(data)}
          />
        }
      >
        <ContentPreferencesDisplay
          data={getPersonaData('contentPreferences') as ContentPreferencesData}
        />
      </PersonaSection>

      {/* Communication Style */}
      <PersonaSection
        title="Communication Style"
        icon={<MessageSquare className="h-5 w-5" />}
        isEditing={editingSection === 'communication'}
        onEdit={() => handleEdit('communication')}
        onSave={handleSave}
        onCancel={handleCancel}
        isUpdating={isUpdating}
        editContent={
          <CommunicationEdit
            data={editData as CommunicationData}
            onChange={(data) => setEditData(data)}
          />
        }
      >
        <CommunicationDisplay data={getPersonaData('communication') as CommunicationData} />
      </PersonaSection>
    </div>
  );
}
