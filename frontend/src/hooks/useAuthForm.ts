'use client';

import { useRouter } from 'next/navigation';
import { useForm, type FieldValues, type DefaultValues, type Resolver } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { useFormSubmit } from './useFormSubmit';
import { getErrorMessage } from '@/utils/errorHandling';
import { getBaseUrl } from '@/lib/utils/url';
import type { User } from '@supabase/supabase-js';

interface UseAuthFormOptions<T extends FieldValues> {
  schema: Resolver<T>;
  defaultValues?: DefaultValues<T>;
  redirectTo?: string;
  onSuccess?: (user?: User) => void;
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
        const loginData = data as unknown as { email: string; password: string };
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });

        if (loginError) {
          throw new Error(getErrorMessage(loginError));
        }

        router.push(options.redirectTo || '/dashboard');
        router.refresh();
        break;

      case 'register':
        const registerData = data as unknown as { email: string; password: string; name: string };
        const { data: authData, error: registerError } = await supabase.auth.signUp({
          email: registerData.email,
          password: registerData.password,
          options: {
            data: {
              full_name: registerData.name,
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
            full_name: registerData.name,
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          router.push('/verify-email?email=' + encodeURIComponent(registerData.email));
        }
        break;

      case 'forgotPassword':
        const forgotData = data as unknown as { email: string };
        const { error: forgotError } = await supabase.auth.resetPasswordForEmail(
          forgotData.email,
          {
            redirectTo: `${getBaseUrl()}/reset-password`,
          }
        );

        if (forgotError) {
          throw new Error(getErrorMessage(forgotError));
        }

        router.push('/check-email?email=' + encodeURIComponent(forgotData.email));
        break;

      case 'resetPassword':
        const resetData = data as unknown as { password: string };
        const { error: resetError } = await supabase.auth.updateUser({
          password: resetData.password,
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