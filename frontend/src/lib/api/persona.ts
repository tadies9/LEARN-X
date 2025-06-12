import { apiClient } from '@/lib/api/client';
import type { Persona } from '@/lib/types/persona';

export const personaApi = {
  // Get current user's persona
  getPersona: async () => {
    const response = await apiClient.get<{ success: boolean; data: Persona }>('/persona');
    return response.data.data;
  },

  // Create or update entire persona
  upsertPersona: async (
    personaData: Omit<Persona, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version'>
  ) => {
    const response = await apiClient.post<{ success: boolean; data: Persona }>(
      '/persona',
      personaData
    );
    return response.data.data;
  },

  // Update specific section
  updateSection: async (section: string, sectionData: any) => {
    const response = await apiClient.patch<{ success: boolean; data: Persona }>(
      `/persona/${section}`,
      sectionData
    );
    return response.data.data;
  },

  // Delete persona (for testing/reset)
  deletePersona: async () => {
    const response = await apiClient.delete<{ success: boolean }>('/persona');
    return response.data.success;
  },

  // Get persona history
  getHistory: async () => {
    const response = await apiClient.get<{ success: boolean; data: Persona[] }>('/persona/history');
    return response.data.data;
  },

  // Export persona data
  exportPersona: async (format: 'json' | 'csv' = 'json') => {
    const response = await apiClient.get(`/persona/export?format=${format}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `learn-x-persona.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
