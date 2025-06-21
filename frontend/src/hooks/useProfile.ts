import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/useToast';

import type { ProfileFormData } from '@/lib/validations/profile';
import type { User } from '@supabase/supabase-js';

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadProfile = async () => {
    if (!user) return null;

    try {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

      return (
        profile || {
          full_name: '',
          bio: '',
          avatar_url: '',
          phone: '',
          location: '',
          website: '',
          linkedin_url: '',
          github_url: '',
        }
      );
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };

  const updateProfile = async (data: ProfileFormData) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    loadProfile,
    updateProfile,
  };
}
