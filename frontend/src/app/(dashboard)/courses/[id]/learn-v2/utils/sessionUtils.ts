import { createClient } from '@/lib/supabase/client';
import { SessionData, UserProfile } from '../types/streaming';

export async function getSession(): Promise<SessionData | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function loadUserProfile(session: SessionData): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/persona`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const profileData = await response.json();
      return profileData;
    }
  } catch (error) {
    // Silently handle error - profile might not exist yet
  }
  return null;
}
