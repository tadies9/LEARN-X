import Link from 'next/link';

import { AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            We couldn't complete your sign in. This might happen if the link expired or was already
            used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Common reasons for this error:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>The sign-in link has expired</li>
              <li>You've already used this link</li>
              <li>The link was incomplete or corrupted</li>
            </ul>
          </div>
          <div className="space-y-2">
            <Link href="/login" className="block">
              <Button className="w-full">Try signing in again</Button>
            </Link>
            <Link href="/forgot-password" className="block">
              <Button variant="outline" className="w-full">
                Reset your password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
