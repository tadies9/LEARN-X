import { FadeIn } from '@/components/animations/FadeIn';
import { usePersona } from '@/hooks/usePersona';

interface DashboardWelcomeProps {
  greeting: string;
}

export function DashboardWelcome({ greeting }: DashboardWelcomeProps) {
  const { persona } = usePersona();

  // Generate streak message based on persona's encouragement level
  const getStreakMessage = () => {
    if (!persona?.communication?.encouragementLevel) {
      return "You're making great progress!";
    }

    switch (persona.communication.encouragementLevel) {
      case 'minimal':
        return 'Consistent progress.';
      case 'moderate':
        return "You're on a 7-day learning streak. Keep it up!";
      case 'high':
        return "🔥 Amazing! 7-day streak! You're crushing it!";
      default:
        return "You're making steady progress!";
    }
  };

  return (
    <FadeIn>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{greeting}</h1>
        <p className="text-muted-foreground">{getStreakMessage()}</p>
      </div>
    </FadeIn>
  );
}
