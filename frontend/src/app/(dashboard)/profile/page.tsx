'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { profileSchema, type ProfileFormData } from '@/lib/validations/profile';
import { PageLoader } from '@/components/ui/PageLoader';
import { ButtonLoader } from '@/components/ui/ButtonLoader';
import { useProfile } from '@/hooks/useProfile';

import { AvatarUpload } from './components/AvatarUpload';
import { ProfileFields } from './components/ProfileFields';

export default function ProfilePage() {
  const { user, loading, loadProfile, updateProfile } = useProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const avatarUrl = watch('avatar_url');

  useEffect(() => {
    async function load() {
      const profile = await loadProfile();
      if (profile) {
        reset({
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          phone: profile.phone || '',
          location: profile.location || '',
          website: profile.website || '',
          linkedin_url: profile.linkedin_url || '',
          github_url: profile.github_url || '',
        });
      }
    }
    if (user) {
      load();
    }
  }, [user, loadProfile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    const success = await updateProfile(data);
    if (success) {
      reset(data);
    }
  };

  if (!user) {
    return <PageLoader message="Loading profile..." />;
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your profile information and how others see you</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <AvatarUpload
              userId={user.id}
              avatarUrl={avatarUrl}
              fullName={watch('full_name')}
              onAvatarChange={(url) => setValue('avatar_url', url, { shouldDirty: true })}
            />

            <ProfileFields register={register} errors={errors} loading={loading} />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const profile = await loadProfile();
                  if (profile) {
                    reset(profile);
                  }
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !isDirty}>
                <ButtonLoader loading={loading} loadingText="Saving...">
                  Save Changes
                </ButtonLoader>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
