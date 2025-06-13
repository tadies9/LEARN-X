'use client';

// 1. React/Next imports
import { ReactNode } from 'react';

// 2. Third-party libraries
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// 3. Internal imports - absolute paths (@/)
import { Card } from '@/components/ui/card';

interface StatsCardProps {
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

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-primary',
  description,
  chart,
}: StatsCardProps) {
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {change && (
                <span
                  className={`text-sm font-medium ${
                    change.type === 'increase' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {change.type === 'increase' ? '+' : '-'}
                  {change.value}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={`rounded-lg p-3 bg-background ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {chart && <div className="mt-4">{chart}</div>}
      </Card>
    </motion.div>
  );
}
