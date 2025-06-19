import axios from 'axios';

import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const API_CLIENT = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
API_CLIENT.interceptors.request.use(async (config) => {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn('Error getting session:', error);
    }

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.warn('Failed to get authentication token:', error);
  }

  return config;
});

// Handle errors
API_CLIENT.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log API errors for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        message: error.response?.data?.message || error.message,
      });
    }

    if (error.response?.status === 401) {
      // Unauthorized request - redirecting to login
      // Redirect to login on unauthorized (only on client side)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else if (error.code === 'ERR_NETWORK') {
      // Network error - backend might be down
      console.warn(
        'Backend API is not available. Please ensure the backend server is running on the correct port.'
      );
    } else if (error.response?.status === 500) {
      console.error('Internal server error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

// Export API_CLIENT as 'api' for backward compatibility
export const api = API_CLIENT;
