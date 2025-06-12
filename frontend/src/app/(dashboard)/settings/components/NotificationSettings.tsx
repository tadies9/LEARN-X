import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { AccountSettingsFormData } from '@/lib/validations/profile';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface NotificationSettingsProps {
  watch: UseFormWatch<AccountSettingsFormData>;
  setValue: UseFormSetValue<AccountSettingsFormData>;
}

export function NotificationSettings({ watch, setValue }: NotificationSettingsProps) {
  const notifications = [
    {
      id: 'email_notifications',
      label: 'Email Notifications',
      description: 'Receive emails about your account activity',
    },
    {
      id: 'study_reminders',
      label: 'Study Reminders',
      description: 'Get reminded to study based on your schedule',
    },
    {
      id: 'weekly_reports',
      label: 'Weekly Progress Reports',
      description: 'Receive weekly summaries of your learning progress',
    },
    {
      id: 'marketing_emails',
      label: 'Marketing Emails',
      description: 'Receive updates about new features and promotions',
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>Choose what emails you want to receive from us</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={notification.id}>{notification.label}</Label>
              <p className="text-sm text-muted-foreground">{notification.description}</p>
            </div>
            <Switch
              id={notification.id}
              checked={watch(notification.id)}
              onCheckedChange={(checked) =>
                setValue(notification.id, checked, { shouldDirty: true })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
