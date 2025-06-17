'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Mail, CheckCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const supabase = createClient();

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (!error) {
        setResendSuccess(true);
      }
    } catch (err) {
      console.error('Error resending email:', err);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 text-primary">
          <Mail className="h-12 w-12" />
        </div>
        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
        <CardDescription>We've sent a verification link to {email || 'your email'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Next steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>You'll be redirected to set up your personalized learning experience</li>
          </ol>
        </div>

        {resendSuccess ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Verification email resent!</span>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Didn't receive the email?</p>
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? 'Resending...' : 'Resend verification email'}
            </Button>
          </div>
        )}

        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">Wrong email address?</p>
          <Link href="/register">
            <Button variant="ghost" className="w-full">
              Back to registration
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
