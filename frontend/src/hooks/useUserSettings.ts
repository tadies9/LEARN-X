import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

import type { AccountSettingsFormData } from '@/lib/validations/profile';
import type { User } from '@supabase/supabase-js';

export function useUserSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
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

  const loadSettings = async () => {
    if (!user) return null;

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return (
        settings || {
          email_notifications: true,
          marketing_emails: false,
          study_reminders: true,
          weekly_reports: true,
          theme: 'system',
          language: 'en',
          timezone: 'America/New_York',
        }
      );
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  };

  const saveSettings = async (data: AccountSettingsFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Settings updated',
        description: 'Your settings have been saved successfully.',
      });

      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    setDeletingAccount(true);
    try {
      const { error: deleteError } = await supabase.from('users').delete().eq('id', user.id);

      if (deleteError) throw deleteError;

      await supabase.auth.signOut();

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return {
    user,
    loading,
    deletingAccount,
    loadSettings,
    saveSettings,
    deleteAccount,
  };
}
