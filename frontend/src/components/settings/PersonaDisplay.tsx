'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Briefcase, 
  BookOpen, 
  Heart, 
  MessageSquare,
  Target,
  Layers
} from 'lucide-react';
import { usePersona } from '@/hooks/usePersona';

export function PersonaDisplay() {
  const { persona, isLoading } = usePersona();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!persona) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No learning profile found. Complete the onboarding to personalize your experience.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Professional Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Professional Background
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {persona.professional_context?.role && (
            <div>
              <span className="text-sm text-muted-foreground">Role:</span>
              <p className="font-medium">{persona.professional_context.role}</p>
            </div>
          )}
          {persona.professional_context?.industry && (
            <div>
              <span className="text-sm text-muted-foreground">Industry:</span>
              <p className="font-medium">{persona.professional_context.industry}</p>
            </div>
          )}
          {persona.professional_context?.experienceYears !== undefined && (
            <div>
              <span className="text-sm text-muted-foreground">Experience:</span>
              <p className="font-medium">{persona.professional_context.experienceYears} years</p>
            </div>
          )}
          {persona.professional_context?.technicalLevel && (
            <div>
              <span className="text-sm text-muted-foreground">Technical Level:</span>
              <Badge variant="secondary" className="ml-2">
                {persona.professional_context.technicalLevel}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Interests & Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {persona.personal_interests?.primary && persona.personal_interests.primary.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Primary Interests:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {persona.personal_interests.primary.map((interest, i) => (
                  <Badge key={i} variant="default">{interest}</Badge>
                ))}
              </div>
            </div>
          )}
          {persona.personal_interests?.secondary && persona.personal_interests.secondary.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Secondary Interests:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {persona.personal_interests.secondary.map((interest, i) => (
                  <Badge key={i} variant="secondary">{interest}</Badge>
                ))}
              </div>
            </div>
          )}
          {persona.personal_interests?.learningTopics && persona.personal_interests.learningTopics.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Learning Topics:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {persona.personal_interests.learningTopics.map((topic, i) => (
                  <Badge key={i} variant="outline">{topic}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {persona.learning_style?.primary && (
            <div>
              <span className="text-sm text-muted-foreground">Primary Style:</span>
              <p className="font-medium capitalize">{persona.learning_style.primary}</p>
            </div>
          )}
          {persona.learning_style?.secondary && (
            <div>
              <span className="text-sm text-muted-foreground">Secondary Style:</span>
              <p className="font-medium capitalize">{persona.learning_style.secondary}</p>
            </div>
          )}
          {persona.content_preferences?.density && (
            <div>
              <span className="text-sm text-muted-foreground">Content Density:</span>
              <Badge variant="secondary" className="ml-2">
                {persona.content_preferences.density}
              </Badge>
            </div>
          )}
          {persona.content_preferences?.examplesPerConcept && (
            <div>
              <span className="text-sm text-muted-foreground">Examples per Concept:</span>
              <p className="font-medium">{persona.content_preferences.examplesPerConcept}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {persona.communication_tone?.style && (
            <div>
              <span className="text-sm text-muted-foreground">Tone:</span>
              <p className="font-medium capitalize">{persona.communication_tone.style}</p>
            </div>
          )}
          {persona.communication_tone?.encouragementLevel && (
            <div>
              <span className="text-sm text-muted-foreground">Encouragement:</span>
              <Badge variant="secondary" className="ml-2">
                {persona.communication_tone.encouragementLevel}
              </Badge>
            </div>
          )}
          {persona.communication_tone?.humorAppropriate !== undefined && (
            <div>
              <span className="text-sm text-muted-foreground">Humor:</span>
              <p className="font-medium">
                {persona.communication_tone.humorAppropriate ? 'Welcome' : 'Keep it professional'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}