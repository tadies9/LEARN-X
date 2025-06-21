'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AuthCard } from '@/components/layouts/AuthCard';
import { getBaseUrl } from '@/lib/utils/url';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${getBaseUrl()}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setEmailSent(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-green-600">
            <CheckCircle className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We've sent password reset instructions to {getValues('email')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              If you don't receive an email within a few minutes, please check your spam folder.
            </p>
          </div>
          <div className="text-center">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email address and we'll send you a link to reset your password"
      footerLink={{
        text: 'Remember your password?',
        linkText: 'Sign in',
        href: '/login',
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="student@example.com"
            {...register('email')}
            disabled={loading}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset instructions'}
        </Button>
      </form>
    </AuthCard>
  );
}
