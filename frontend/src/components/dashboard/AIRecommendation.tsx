import { Brain, Target } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/animations/FadeIn';

export function AIRecommendation() {
  return (
    <FadeIn delay={0.8}>
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">AI Recommendation</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Based on your progress in React, we recommend exploring "State Management with
              Zustand" next. It aligns perfectly with your learning path.
            </p>
            <Button size="sm">
              <Target className="h-4 w-4 mr-2" />
              Start Recommended Course
            </Button>
          </div>
        </div>
      </Card>
    </FadeIn>
  );
}