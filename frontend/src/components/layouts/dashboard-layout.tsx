'use client';

import { ReactNode } from 'react';
import { DashboardSidebar } from '@/components/navigation/dashboard-sidebar';
import { DashboardHeader } from '@/components/navigation/dashboard-header';

interface DashboardLayoutProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
