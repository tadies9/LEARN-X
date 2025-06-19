'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { usePersona } from '@/hooks/usePersona';
import type { PersonaSection, EditData } from './types';

export function usePersonaForm() {
  const { persona, isLoading, updatePersonaSection, isUpdating } = usePersona();
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<PersonaSection | null>(null);
  const [editData, setEditData] = useState<EditData>({});

  // Helper to get data from persona object, handling both camelCase and snake_case
  const getPersonaData = (section: PersonaSection): EditData | null => {
    if (!persona) return null;
    const personaAny = persona as unknown as Record<string, unknown>;

    switch (section) {
      case 'academicCareer':
        return persona.academicCareer || persona.professional || personaAny.professional_context;
      case 'interests':
        return persona.interests || personaAny.personal_interests;
      case 'learningStyle':
        return persona.learningStyle || personaAny.learning_style;
      case 'communication':
        return persona.communication || personaAny.communication_tone;
      case 'contentPreferences':
        return persona.contentPreferences || personaAny.content_preferences;
      default:
        return null;
    }
  };

  const handleEdit = (section: PersonaSection) => {
    setEditingSection(section);
    const data = getPersonaData(section);

    // Set default structure if no data exists
    const defaults: Record<PersonaSection, EditData> = {
      academicCareer: {},
      interests: { primary: [], secondary: [], learningTopics: [] },
      learningStyle: {},
      communication: {},
      contentPreferences: {},
    };

    setEditData(data || defaults[section] || {});
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editingSection) return;

    try {
      await updatePersonaSection({ section: editingSection, data: editData as Record<string, unknown> });
      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });
      setEditingSection(null);
      setEditData({});
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return {
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
  };
}
