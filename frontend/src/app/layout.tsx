import type { Metadata } from 'next';
import { EnhancedThemeProvider } from '@/components/providers/EnhancedThemeProvider';
import { ThemeScript } from '@/components/ThemeScript';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEARN-X - AI-Powered Personalized Learning',
  description:
    'Transform your learning with AI that adapts to your unique style, interests, and goals',
  keywords: ['education', 'AI', 'personalized learning', 'EdTech', 'online learning'],
  authors: [{ name: 'LEARN-X Team' }],
  openGraph: {
    title: 'LEARN-X - AI-Powered Personalized Learning',
    description: 'Transform your learning with AI that adapts to your unique style',
    type: 'website',
    locale: 'en_US',
    siteName: 'LEARN-X',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LEARN-X - AI-Powered Personalized Learning',
    description: 'Transform your learning with AI that adapts to your unique style',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <meta name="theme-color" content="#ffffff" />
        <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
        <link rel="preload" as="image" href="/demo-thumbnail.svg" />
      </head>
      <body className={cn('min-h-screen bg-background font-sans antialiased')}>
        <EnhancedThemeProvider
          defaultTheme="system"
          storageKey="learn-x-theme"
          enableTransitions={true}
        >
          <AppLayout>{children}</AppLayout>
          <Toaster
            position="bottom-right"
            visibleToasts={process.env.NODE_ENV === 'production' ? 3 : 1}
            style={{
              display: process.env.NODE_ENV === 'production' ? 'block' : 'none',
            }}
          />
        </EnhancedThemeProvider>
      </body>
    </html>
  );
}
