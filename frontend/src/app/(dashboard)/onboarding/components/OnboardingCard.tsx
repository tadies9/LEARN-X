import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface OnboardingCardProps {
  children: React.ReactNode;
  className?: string;
}

export function OnboardingCard({ children, className }: OnboardingCardProps) {
  return (
    <Card 
      className={cn(
        "border-2 border-gray-900 dark:border-gray-100 shadow-xl",
        "bg-white dark:bg-gray-900",
        "relative overflow-hidden",
        className
      )}
    >
      {children}
    </Card>
  );
}