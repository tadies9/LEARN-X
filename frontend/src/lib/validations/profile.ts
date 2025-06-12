import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  avatar_url: z.string().url().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  github_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const accountSettingsSchema = z.object({
  email_notifications: z.boolean(),
  marketing_emails: z.boolean(),
  study_reminders: z.boolean(),
  weekly_reports: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  timezone: z.string(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type AccountSettingsFormData = z.infer<typeof accountSettingsSchema>;
