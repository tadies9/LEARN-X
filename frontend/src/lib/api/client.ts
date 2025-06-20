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

    // First try to get the current session
    let {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // If no session or error, try to refresh the session
    if (!session || error) {
      const refreshResult = await supabase.auth.refreshSession();
      session = refreshResult.data.session;
      error = refreshResult.error;

      if (process.env.NODE_ENV === 'development' && refreshResult.data.session) {
        console.log('Session refreshed successfully');
      }
    }

    if (error) {
      console.warn('Error getting/refreshing session:', error);
    }

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasAuth: true,
          tokenPreview: `${session.access_token.substring(0, 20)}...`,
        });
      }
    } else {
      // Debug logging when no token
      if (process.env.NODE_ENV === 'development') {
        console.warn('API Request without auth token:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasSession: !!session,
        });
      }
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
      // Skip redirect for DELETE requests to allow retry logic
      if (typeof window !== 'undefined' && error.config?.method !== 'delete') {
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
