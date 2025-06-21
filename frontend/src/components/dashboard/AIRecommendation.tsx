import { Brain, Target, Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { FadeIn } from '@/components/animations/FadeIn';
import { dashboardApi } from '@/lib/api/DashboardApiService';
import { cn } from '@/lib/utils';

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const difficultyIcons = {
  beginner: TrendingUp,
  intermediate: Sparkles,
  advanced: Brain,
};

export function AIRecommendation() {
  const router = useRouter();

  // Fetch AI recommendations from the API
  const {
    data: recommendations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: () => dashboardApi.getRecommendations(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-9 w-24 mt-3" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !recommendations || recommendations.length === 0) {
    return (
      <FadeIn delay={0.8}>
        <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-muted p-3">
              <Brain className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">AI Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Complete your profile to get personalized course recommendations.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => router.push('/settings/profile')}
              >
                Complete Profile
              </Button>
            </div>
          </div>
        </Card>
      </FadeIn>
    );
  }

  // Show the top recommendation prominently
  const topRecommendation = recommendations[0];
  const DifficultyIcon = difficultyIcons[topRecommendation.difficulty] || Brain;

  return (
    <FadeIn delay={0.8}>
      <div className="space-y-4">
        {/* Primary Recommendation */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <DifficultyIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">Recommended Next</h3>
                <Badge className={cn('text-xs', difficultyColors[topRecommendation.difficulty])}>
                  {topRecommendation.difficulty}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>{topRecommendation.title}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-3">{topRecommendation.description}</p>
              <p className="text-xs text-muted-foreground mb-3 italic">
                {topRecommendation.reason}
              </p>
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/courses/new?template=${encodeURIComponent(topRecommendation.title)}`
                  )
                }
              >
                <Target className="h-4 w-4 mr-2" />
                Start Learning
              </Button>
            </div>
          </div>
        </Card>

        {/* Additional Recommendations */}
        {recommendations.length > 1 && (
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              More Suggestions
            </h4>
            <div className="space-y-2">
              {recommendations.slice(1, 3).map((rec, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() =>
                    router.push(`/courses/new?template=${encodeURIComponent(rec.title)}`)
                  }
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2">
                    {rec.difficulty}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
