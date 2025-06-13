// 1. React/Next imports
import { ReactNode } from 'react';

// 2. Third-party libraries
import { LucideIcon } from 'lucide-react';

// 3. Internal imports - absolute paths (@/)
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { FadeIn } from '@/components/animations/FadeIn';

interface StatsData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  chart?: ReactNode;
}

interface DashboardStatsProps {
  statsData: StatsData[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function DashboardStats({ statsData, loading, error, onRetry }: DashboardStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {loading ? (
        <div className="col-span-4 text-center">Loading dashboard data...</div>
      ) : error ? (
        <div className="col-span-4 text-center text-red-500">
          Error: {error}
          <Button onClick={onRetry} className="ml-2" variant="outline" size="sm">
            Retry
          </Button>
        </div>
      ) : (
        statsData.map((stat, index) => (
          <FadeIn key={stat.title} delay={index * 0.1}>
            <StatsCard {...stat} />
          </FadeIn>
        ))
      )}
    </div>
  );
}