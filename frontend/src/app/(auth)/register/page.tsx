'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layouts/AuthCard';
import { Checkbox } from '@/components/ui/checkbox';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { SocialAuthDivider } from '@/components/auth/SocialAuthDivider';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { FormField } from '@/components/ui/form-field';
import { getBaseUrl } from '@/lib/utils/url';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          },
          emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/onboarding`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: data.name,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Redirect to onboarding
        router.push('/verify-email?email=' + encodeURIComponent(data.email));
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      description="Start your personalized learning journey today"
      footerLink={{
        text: 'Already have an account?',
        linkText: 'Sign in',
        href: '/login',
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Sarah Johnson"
            {...register('name')}
            disabled={loading}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </FormField>
        <FormField>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="student@example.com"
            {...register('email')}
            disabled={loading}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </FormField>
        <FormField>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register('password')} disabled={loading} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          <PasswordRequirements password={password} />
        </FormField>
        <FormField>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            disabled={loading}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </FormField>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
            disabled={loading}
          />
          <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <SocialAuthDivider />
      <GoogleAuthButton
        mode="signup"
        redirectTo={`${getBaseUrl()}/auth/callback?next=/onboarding`}
      />
    </AuthCard>
  );
}
