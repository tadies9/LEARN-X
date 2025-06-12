import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthCardProps {
  /** The main title of the auth card */
  title: string;
  /** Optional description text below the title */
  description?: string;
  /** The main content of the card (usually a form) */
  children: ReactNode;
  /** Optional footer content */
  footerContent?: ReactNode;
  /** Optional footer link configuration */
  footerLink?: {
    text: string;
    linkText: string;
    href: string;
  };
}

/**
 * Reusable authentication card layout component
 * Provides consistent structure for auth pages like login, register, forgot password, etc.
 */
export function AuthCard({
  title,
  description,
  children,
  footerContent,
  footerLink,
}: AuthCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {(footerContent || footerLink) && (
        <CardFooter className="flex flex-col space-y-2">
          {footerContent}
          {footerLink && (
            <div className="text-sm text-muted-foreground text-center w-full">
              {footerLink.text}{' '}
              <Link href={footerLink.href} className="text-primary hover:underline">
                {footerLink.linkText}
              </Link>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
