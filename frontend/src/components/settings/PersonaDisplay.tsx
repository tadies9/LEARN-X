'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Briefcase, BookOpen, Heart, MessageSquare, Target, Layers } from 'lucide-react';
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
          {persona.professional?.role && (
            <div>
              <span className="text-sm text-muted-foreground">Role:</span>
              <p className="font-medium">{persona.professional.role}</p>
            </div>
          )}
          {persona.professional?.industry && (
            <div>
              <span className="text-sm text-muted-foreground">Industry:</span>
              <p className="font-medium">{persona.professional.industry}</p>
            </div>
          )}
          {persona.professional?.experienceYears !== undefined && (
            <div>
              <span className="text-sm text-muted-foreground">Experience:</span>
              <p className="font-medium">{persona.professional.experienceYears} years</p>
            </div>
          )}
          {persona.professional?.technicalLevel && (
            <div>
              <span className="text-sm text-muted-foreground">Technical Level:</span>
              <Badge variant="secondary" className="ml-2">
                {persona.professional.technicalLevel}
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
          {persona.interests?.primary && persona.interests.primary.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Primary Interests:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {persona.interests.primary.map((interest, i) => (
                  <Badge key={i} variant="default">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {persona.interests?.secondary && persona.interests.secondary.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Secondary Interests:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {persona.interests.secondary.map((interest, i) => (
                  <Badge key={i} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {persona.interests?.learningTopics && persona.interests.learningTopics.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Learning Topics:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {persona.interests.learningTopics.map((topic, i) => (
                  <Badge key={i} variant="outline">
                    {topic}
                  </Badge>
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
          {persona.learningStyle?.primary && (
            <div>
              <span className="text-sm text-muted-foreground">Primary Style:</span>
              <p className="font-medium capitalize">{persona.learningStyle.primary}</p>
            </div>
          )}
          {persona.learningStyle?.secondary && (
            <div>
              <span className="text-sm text-muted-foreground">Secondary Style:</span>
              <p className="font-medium capitalize">{persona.learningStyle.secondary}</p>
            </div>
          )}
          {persona.contentPreferences?.density && (
            <div>
              <span className="text-sm text-muted-foreground">Content Density:</span>
              <Badge variant="secondary" className="ml-2">
                {persona.contentPreferences.density}
              </Badge>
            </div>
          )}
          {persona.contentPreferences?.examplesPerConcept && (
            <div>
              <span className="text-sm text-muted-foreground">Examples per Concept:</span>
              <p className="font-medium">{persona.contentPreferences.examplesPerConcept}</p>
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
          {persona.communication?.style && (
            <div>
              <span className="text-sm text-muted-foreground">Tone:</span>
              <p className="font-medium capitalize">{persona.communication.style}</p>
            </div>
          )}
          {persona.communication?.encouragementLevel && (
            <div>
              <span className="text-sm text-muted-foreground">Encouragement:</span>
              <Badge variant="secondary" className="ml-2">
                {persona.communication.encouragementLevel}
              </Badge>
            </div>
          )}
          {persona.communication?.humorAppropriate !== undefined && (
            <div>
              <span className="text-sm text-muted-foreground">Humor:</span>
              <p className="font-medium">
                {persona.communication.humorAppropriate ? 'Welcome' : 'Keep it professional'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
