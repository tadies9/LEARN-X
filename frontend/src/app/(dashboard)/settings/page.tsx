"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { accountSettingsSchema, type AccountSettingsFormData } from '@/lib/validations/profile'
import { PageLoader } from '@/components/ui/page-loader'
import { ButtonLoader } from '@/components/ui/button-loader'
import { NotificationSettings } from './components/NotificationSettings'
import { AppearanceSettings } from './components/AppearanceSettings'
import { AccountSettings } from './components/AccountSettings'
import { PersonaSettings } from './components/PersonaSettings'
import { useUserSettings } from '@/hooks/useUserSettings'

export default function SettingsPage() {
  const { user, loading, deletingAccount, loadSettings, saveSettings, deleteAccount } = useUserSettings()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<AccountSettingsFormData>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      email_notifications: true,
      marketing_emails: false,
      study_reminders: true,
      weekly_reports: true,
      theme: 'system',
      language: 'en',
      timezone: 'America/New_York',
    },
  })

  useEffect(() => {
    async function load() {
      const settings = await loadSettings();
      if (settings) {
        reset({
          email_notifications: settings.email_notifications ?? true,
          marketing_emails: settings.marketing_emails ?? false,
          study_reminders: settings.study_reminders ?? true,
          weekly_reports: settings.weekly_reports ?? true,
          theme: settings.theme ?? 'system',
          language: settings.language ?? 'en',
          timezone: settings.timezone ?? 'America/New_York',
        });
      }
    }
    if (user) {
      load();
    }
  }, [user, loadSettings, reset])

  const onSubmit = async (data: AccountSettingsFormData) => {
    const success = await saveSettings(data);
    if (success) {
      reset(data);
    }
  }

  if (!user) {
    return <PageLoader message="Loading settings..." />;
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="persona">Learning Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="notifications">
            <NotificationSettings watch={watch} setValue={setValue} />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettings watch={watch} setValue={setValue} />
          </TabsContent>

          <TabsContent value="persona">
            <PersonaSettings />
          </TabsContent>

          <TabsContent value="account">
            <AccountSettings 
              user={user} 
              onDeleteAccount={deleteAccount}
              deletingAccount={deletingAccount}
            />
          </TabsContent>

          {isDirty && (
            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const settings = await loadSettings();
                  if (settings) {
                    reset(settings);
                  }
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <ButtonLoader loading={loading} loadingText="Saving...">
                  Save Changes
                </ButtonLoader>
              </Button>
            </div>
          )}
        </form>
      </Tabs>
    </div>
  )
}