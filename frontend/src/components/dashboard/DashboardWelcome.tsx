import { FadeIn } from '@/components/animations/FadeIn';

interface DashboardWelcomeProps {
  userName: string;
}

export function DashboardWelcome({ userName }: DashboardWelcomeProps) {
  return (
    <FadeIn>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">You're on a 7-day learning streak. Keep it up!</p>
      </div>
    </FadeIn>
  );
}