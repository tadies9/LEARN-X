'use client';

import { useRouter } from 'next/navigation';
import { useForm, type FieldValues, type DefaultValues } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { useFormSubmit } from './useFormSubmit';
import { getErrorMessage } from '@/utils/errorHandling';
import { getBaseUrl } from '@/lib/utils/url';

interface UseAuthFormOptions<T extends FieldValues> {
  schema: any;
  defaultValues?: DefaultValues<T>;
  redirectTo?: string;
  onSuccess?: (user?: any) => void;
}

export function useAuthForm<T extends FieldValues>(
  type: 'login' | 'register' | 'resetPassword' | 'forgotPassword',
  options: UseAuthFormOptions<T>
) {
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<T>({
    resolver: options.schema,
    defaultValues: options.defaultValues,
  });

  const handleAuth = async (data: T) => {
    switch (type) {
      case 'login':
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: (data as any).email,
          password: (data as any).password,
        });

        if (loginError) {
          throw new Error(getErrorMessage(loginError));
        }

        router.push(options.redirectTo || '/dashboard');
        router.refresh();
        break;

      case 'register':
        const { data: authData, error: registerError } = await supabase.auth.signUp({
          email: (data as any).email,
          password: (data as any).password,
          options: {
            data: {
              full_name: (data as any).name,
            },
            emailRedirectTo: `${getBaseUrl()}/auth/callback?next=${options.redirectTo || '/onboarding'}`,
          },
        });

        if (registerError) {
          throw new Error(getErrorMessage(registerError));
        }

        if (authData.user) {
          // Create user profile
          const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: (data as any).name,
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          router.push('/verify-email?email=' + encodeURIComponent((data as any).email));
        }
        break;

      case 'forgotPassword':
        const { error: forgotError } = await supabase.auth.resetPasswordForEmail(
          (data as any).email,
          {
            redirectTo: `${getBaseUrl()}/reset-password`,
          }
        );

        if (forgotError) {
          throw new Error(getErrorMessage(forgotError));
        }

        router.push('/check-email?email=' + encodeURIComponent((data as any).email));
        break;

      case 'resetPassword':
        const { error: resetError } = await supabase.auth.updateUser({
          password: (data as any).password,
        });

        if (resetError) {
          throw new Error(getErrorMessage(resetError));
        }

        router.push('/login?reset=success');
        break;

      default:
        throw new Error('Invalid auth type');
    }

    options.onSuccess?.();
  };

  const formSubmit = useFormSubmit({
    onSuccess: () => {
      options.onSuccess?.();
    },
    onError: (error) => {
      console.error(`Auth ${type} error:`, error);
    },
    successMessage: `${type.charAt(0).toUpperCase() + type.slice(1)} successful!`,
  });

  const onSubmit = form.handleSubmit(async (data) => {
    await formSubmit.submit(async () => {
      await handleAuth(data);
      return data;
    });
  });

  return {
    form,
    ...formSubmit,
    onSubmit,
    register: form.register,
    formState: form.formState,
    watch: form.watch,
    setValue: form.setValue,
  };
}