'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Annotation {
  id: string;
  fileId: string;
  text: string;
  note?: string;
  color: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: Date;
}

type CreateAnnotationData = Omit<Annotation, 'id' | 'createdAt'>;
type UpdateAnnotationData = Partial<Omit<Annotation, 'id' | 'fileId' | 'createdAt'>>;

export function useAnnotations(fileId: string) {
  const queryClient = useQueryClient();

  // Fetch annotations
  const {
    data: annotations,
    isLoading: loading,
    error,
  } = useQuery<Annotation[]>({
    queryKey: ['annotations', fileId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/annotations/${fileId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch annotations');
      }
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!fileId,
  });

  // Create annotation mutation
  const createMutation = useMutation({
    mutationFn: async (annotationData: CreateAnnotationData): Promise<Annotation> => {
      const response = await fetch('/api/sessions/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      if (!response.ok) {
        throw new Error('Failed to create annotation');
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', fileId] });
    },
  });

  // Update annotation mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateAnnotationData;
    }): Promise<Annotation> => {
      const response = await fetch(`/api/sessions/annotations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update annotation');
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', fileId] });
    },
  });

  // Delete annotation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/sessions/annotations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete annotation');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', fileId] });
    },
  });

  return {
    annotations,
    loading,
    error,
    createAnnotation: createMutation.mutateAsync,
    updateAnnotation: (id: string, updates: UpdateAnnotationData) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteAnnotation: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}