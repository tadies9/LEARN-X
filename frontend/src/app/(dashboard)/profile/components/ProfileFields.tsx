import type { UseFormRegister, FieldErrors } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { ProfileFormData } from '@/lib/validations/profile';

interface ProfileFieldsProps {
  register: UseFormRegister<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
  loading: boolean;
}

interface Field {
  id: keyof ProfileFormData;
  label: string;
  type?: string;
  placeholder?: string;
  component?: 'input' | 'textarea';
  rows?: number;
}

const fields: Field[] = [
  {
    id: 'full_name',
    label: 'Full Name',
    type: 'text',
  },
  {
    id: 'bio',
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    component: 'textarea',
    rows: 4,
  },
  {
    id: 'location',
    label: 'Location',
    placeholder: 'San Francisco, CA',
  },
  {
    id: 'phone',
    label: 'Phone Number',
    placeholder: '+1 (555) 123-4567',
  },
  {
    id: 'website',
    label: 'Website',
    placeholder: 'https://example.com',
  },
  {
    id: 'linkedin_url',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    id: 'github_url',
    label: 'GitHub',
    placeholder: 'https://github.com/username',
  },
];

export function ProfileFields({ register, errors, loading }: ProfileFieldsProps) {
  return (
    <div className="grid gap-4">
      {fields.map((field) => (
        <div key={field.id} className="grid gap-2">
          <Label htmlFor={field.id}>{field.label}</Label>
          {field.component === 'textarea' ? (
            <Textarea
              id={field.id}
              {...register(field.id)}
              disabled={loading}
              placeholder={field.placeholder}
              rows={field.rows}
            />
          ) : (
            <Input
              id={field.id}
              type={field.type || 'text'}
              {...register(field.id)}
              disabled={loading}
              placeholder={field.placeholder}
            />
          )}
          {errors[field.id] && (
            <p className="text-sm text-destructive">{errors[field.id]?.message}</p>
          )}
        </div>
      ))}
    </div>
  );
}
