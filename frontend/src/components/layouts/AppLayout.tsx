'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { DashboardSidebar } from '@/components/navigation/DashboardSidebar';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: ReactNode;
}

// Routes that should NOT use the sidebar
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth-code-error',
  '/auth/callback',
  '/onboarding', // Onboarding should not show sidebar as it's a prerequisite
];

// Landing page route that should use its own layout
const landingRoutes = ['/'];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Check if current route should use sidebar
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isLandingRoute = landingRoutes.includes(pathname);

  // Use sidebar for all pages except auth routes and landing page
  const shouldUseSidebar = !isAuthRoute && !isLandingRoute;

  if (shouldUseSidebar) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    );
  }

  // For auth routes and landing page, render without sidebar
  return <>{children}</>;
}
