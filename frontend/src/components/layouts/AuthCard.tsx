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
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/[0.2] dark:bg-transparent pointer-events-none" />
      <CardHeader className="space-y-1 relative">
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{title}</CardTitle>
        {description && <CardDescription className="text-gray-600 dark:text-gray-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="relative">{children}</CardContent>
      {(footerContent || footerLink) && (
        <CardFooter className="flex flex-col space-y-2 relative">
          {footerContent}
          {footerLink && (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center w-full">
              {footerLink.text}{' '}
              <Link href={footerLink.href} className="text-primary hover:underline font-medium">
                {footerLink.linkText}
              </Link>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
