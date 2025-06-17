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
        "border border-gray-200 dark:border-gray-800 shadow-lg",
        "bg-white dark:bg-gray-900",
        "relative overflow-hidden",
        "transition-all duration-200 hover:shadow-xl",
        className
      )}
    >
      {children}
    </Card>
  );
}