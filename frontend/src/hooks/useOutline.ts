'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface OutlineSection {
  id: string;
  title: string;
  summary: string;
  chunkIds: string[];
  chunkCount: number;
  startPage: number;
  endPage: number;
  topics: string[];
}

interface Outline {
  fileId: string;
  sections: OutlineSection[];
  generatedAt: Date;
}

export function useOutline(fileId: string) {
  const { data: outline, isLoading, error } = useQuery<Outline>({
    queryKey: ['outline', fileId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/learn/outline/${fileId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch outline');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  return {
    outline,
    loading: isLoading,
    error: error?.message,
  };
}