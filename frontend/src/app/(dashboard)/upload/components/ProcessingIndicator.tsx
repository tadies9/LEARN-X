import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain } from 'lucide-react';

interface ProcessingIndicatorProps {
  progress: number;
}

export function ProcessingIndicator({ progress }: ProcessingIndicatorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          AI Processing Your Content
        </CardTitle>
        <CardDescription>
          Our AI is analyzing your content and personalizing it based on your learning profile...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            This usually takes 30-60 seconds depending on document length
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
