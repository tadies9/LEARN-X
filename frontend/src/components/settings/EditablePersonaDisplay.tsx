'use client';

import { useState } from 'react';

// Type definitions
type PersonaSection =
  | 'academicCareer'
  | 'interests'
  | 'learningStyle'
  | 'communication'
  | 'contentPreferences';

interface AcademicCareerData {
  currentStatus?: string;
  fieldOfStudy?: string;
  aspiredIndustry?: string;
  careerGoalsLearningObjectives?: string;
}

interface InterestsData {
  primary?: string[];
  secondary?: string[];
  learningTopics?: string[];
}

interface LearningStyleData {
  primary?: string;
  secondary?: string;
  preferenceStrength?: number;
}

interface CommunicationData {
  style?: string;
  encouragementLevel?: string;
  humorAppropriate?: boolean;
}

interface ContentPreferencesData {
  density?: string;
  detailTolerance?: string;
  repetitionPreference?: string;
}

type EditData =
  | AcademicCareerData
  | InterestsData
  | LearningStyleData
  | CommunicationData
  | ContentPreferencesData;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { GraduationCap, Heart, MessageSquare, FileText, Brain, Edit, Save, X } from 'lucide-react';
import { usePersona } from '@/hooks/usePersona';
import { INDUSTRIES, LEARNING_TOPICS, INTEREST_CATEGORIES } from '@/lib/types/persona';

const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual' },
  { id: 'auditory', label: 'Auditory' },
  { id: 'reading', label: 'Reading/Writing' },
  { id: 'kinesthetic', label: 'Kinesthetic' },
];

const COMMUNICATION_STYLES = [
  { value: 'formal', label: 'Formal' },
  { value: 'professional_friendly', label: 'Professional & Friendly' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'casual', label: 'Casual' },
];

const ENCOURAGEMENT_LEVELS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

const CONTENT_DENSITY_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

export function EditablePersonaDisplay() {
  const { persona, isLoading, updatePersonaSection, isUpdating } = usePersona();
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<PersonaSection | null>(null);
  const [editData, setEditData] = useState<EditData>({});

  // Helper to get data from persona object, handling both camelCase and snake_case
  const getPersonaData = (section: PersonaSection): EditData | null => {
    if (!persona) return null;
    const personaAny = persona as unknown as Record<string, unknown>;

    switch (section) {
      case 'academicCareer':
        return persona.academicCareer || persona.professional || personaAny.professional_context;
      case 'interests':
        return persona.interests || personaAny.personal_interests;
      case 'learningStyle':
        return persona.learningStyle || personaAny.learning_style;
      case 'communication':
        return persona.communication || personaAny.communication_tone;
      case 'contentPreferences':
        return persona.contentPreferences || personaAny.content_preferences;
      default:
        return null;
    }
  };

  const handleEdit = (section: PersonaSection) => {
    setEditingSection(section);
    const data = getPersonaData(section);

    // Set default structure if no data exists
    const defaults: Record<PersonaSection, EditData> = {
      academicCareer: {},
      interests: { primary: [], secondary: [], learningTopics: [] },
      learningStyle: {},
      communication: {},
      contentPreferences: {},
    };

    setEditData(data || defaults[section] || {});
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editingSection) return;

    try {
      await updatePersonaSection({ section: editingSection, data: editData });
      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });
      setEditingSection(null);
      setEditData({});
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleInterestToggle = (
    category: 'primary' | 'secondary' | 'learningTopics',
    value: string
  ) => {
    const interestsData = editData as InterestsData;
    const currentItems = interestsData[category] || [];
    const newItems = currentItems.includes(value)
      ? currentItems.filter((item: string) => item !== value)
      : [...currentItems, value];

    setEditData({ ...interestsData, [category]: newItems });
  };

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
      {/* Academic & Career Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic & Career Goals
            </CardTitle>
            {editingSection !== 'academicCareer' && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit('academicCareer')}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSection === 'academicCareer' ? (
            <>
              <div>
                <Label htmlFor="currentStatus">Current Status</Label>
                <Input
                  id="currentStatus"
                  value={(editData as AcademicCareerData).currentStatus || ''}
                  onChange={(e) =>
                    setEditData({
                      ...(editData as AcademicCareerData),
                      currentStatus: e.target.value,
                    })
                  }
                  placeholder="e.g., Computer Science Student, High School Senior"
                />
              </div>
              <div>
                <Label htmlFor="fieldOfStudy">Field of Study</Label>
                <Input
                  id="fieldOfStudy"
                  value={(editData as AcademicCareerData).fieldOfStudy || ''}
                  onChange={(e) =>
                    setEditData({
                      ...(editData as AcademicCareerData),
                      fieldOfStudy: e.target.value,
                    })
                  }
                  placeholder="e.g., Computer Science, Business Administration"
                />
              </div>
              <div>
                <Label htmlFor="aspiredIndustry">Aspired Industry</Label>
                <Select
                  value={(editData as AcademicCareerData).aspiredIndustry || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as AcademicCareerData), aspiredIndustry: value })
                  }
                >
                  <SelectTrigger id="aspiredIndustry">
                    <SelectValue placeholder="Select your desired industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="careerGoals">Career Goals & Learning Objectives</Label>
                <Textarea
                  id="careerGoals"
                  value={(editData as AcademicCareerData).careerGoalsLearningObjectives || ''}
                  onChange={(e) =>
                    setEditData({
                      ...(editData as AcademicCareerData),
                      careerGoalsLearningObjectives: e.target.value,
                    })
                  }
                  placeholder="What are your career goals? What skills do you want to learn?"
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const data = getPersonaData('academicCareer') as AcademicCareerData | null;
                return data ? (
                  <>
                    {data.currentStatus && (
                      <div>
                        <span className="text-sm text-muted-foreground">Current Status:</span>
                        <p className="font-medium">{data.currentStatus}</p>
                      </div>
                    )}
                    {data.fieldOfStudy && (
                      <div>
                        <span className="text-sm text-muted-foreground">Field of Study:</span>
                        <p className="font-medium">{data.fieldOfStudy}</p>
                      </div>
                    )}
                    {data.aspiredIndustry && (
                      <div>
                        <span className="text-sm text-muted-foreground">Aspired Industry:</span>
                        <p className="font-medium">{data.aspiredIndustry}</p>
                      </div>
                    )}
                    {data.careerGoalsLearningObjectives && (
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Career Goals & Learning Objectives:
                        </span>
                        <p className="text-sm mt-1">{data.careerGoalsLearningObjectives}</p>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Interests & Learning Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Interests & Learning Goals
            </CardTitle>
            {editingSection !== 'interests' && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit('interests')}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSection === 'interests' ? (
            <>
              <div>
                <Label>Primary Interests (Max 5)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Click interests to select them. These will be used as primary examples.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(INTEREST_CATEGORIES)
                    .flatMap(([_, items]) => items)
                    .map((interest) => (
                      <Badge
                        key={interest}
                        variant={
                          (editData as InterestsData).primary?.includes(interest)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          if (
                            (editData as InterestsData).primary?.includes(interest) ||
                            ((editData as InterestsData).primary?.length || 0) < 5
                          ) {
                            handleInterestToggle('primary', interest);
                          }
                        }}
                      >
                        {interest}
                      </Badge>
                    ))}
                </div>
              </div>
              <div>
                <Label>Secondary Interests (Max 5)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(INTEREST_CATEGORIES)
                    .flatMap(([_, items]) => items)
                    .filter((interest) => !(editData as InterestsData).primary?.includes(interest))
                    .map((interest) => (
                      <Badge
                        key={interest}
                        variant={
                          (editData as InterestsData).secondary?.includes(interest)
                            ? 'secondary'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          if (
                            (editData as InterestsData).secondary?.includes(interest) ||
                            ((editData as InterestsData).secondary?.length || 0) < 5
                          ) {
                            handleInterestToggle('secondary', interest);
                          }
                        }}
                      >
                        {interest}
                      </Badge>
                    ))}
                </div>
              </div>
              <div>
                <Label>Learning Topics (Max 10)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the subjects and skills you want to learn about
                </p>
                <div className="flex flex-wrap gap-2">
                  {LEARNING_TOPICS.map((topic) => (
                    <Badge
                      key={topic}
                      variant={
                        (editData as InterestsData).learningTopics?.includes(topic)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        if (
                          (editData as InterestsData).learningTopics?.includes(topic) ||
                          ((editData as InterestsData).learningTopics?.length || 0) < 10
                        ) {
                          handleInterestToggle('learningTopics', topic);
                        }
                      }}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const data = getPersonaData('interests') as InterestsData | null;
                return data ? (
                  <>
                    {data.primary && data.primary.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Primary Interests:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {data.primary.map((interest: string, i: number) => (
                            <Badge key={i} variant="default">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.secondary && data.secondary.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Secondary Interests:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {data.secondary.map((interest: string, i: number) => (
                            <Badge key={i} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.learningTopics && data.learningTopics.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Learning Topics:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {data.learningTopics.map((topic: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Learning Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Learning Style
            </CardTitle>
            {editingSection !== 'learningStyle' && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit('learningStyle')}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSection === 'learningStyle' ? (
            <>
              <div>
                <Label htmlFor="primary-style">Primary Learning Style</Label>
                <Select
                  value={(editData as LearningStyleData).primary || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as LearningStyleData), primary: value })
                  }
                >
                  <SelectTrigger id="primary-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEARNING_STYLES.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="secondary-style">Secondary Learning Style (Optional)</Label>
                <Select
                  value={(editData as LearningStyleData).secondary || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as LearningStyleData), secondary: value })
                  }
                >
                  <SelectTrigger id="secondary-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {LEARNING_STYLES.filter(
                      (s) => s.id !== (editData as LearningStyleData).primary
                    ).map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const data = getPersonaData('learningStyle') as LearningStyleData | null;
                return data ? (
                  <>
                    {data.primary && (
                      <div>
                        <span className="text-sm text-muted-foreground">Primary Style:</span>
                        <p className="font-medium capitalize">{data.primary}</p>
                      </div>
                    )}
                    {data.secondary && (
                      <div>
                        <span className="text-sm text-muted-foreground">Secondary Style:</span>
                        <p className="font-medium capitalize">{data.secondary}</p>
                      </div>
                    )}
                    {data.preferenceStrength !== undefined && (
                      <div>
                        <span className="text-sm text-muted-foreground">Preference Strength:</span>
                        <p className="font-medium">{Math.round(data.preferenceStrength * 100)}%</p>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Content Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Preferences
            </CardTitle>
            {editingSection !== 'contentPreferences' && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit('contentPreferences')}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSection === 'contentPreferences' ? (
            <>
              <div>
                <Label htmlFor="density">Content Density</Label>
                <Select
                  value={(editData as ContentPreferencesData).density || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as ContentPreferencesData), density: value })
                  }
                >
                  <SelectTrigger id="density">
                    <SelectValue placeholder="Select density" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_DENSITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="detail">Detail Tolerance</Label>
                <Select
                  value={(editData as ContentPreferencesData).detailTolerance || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as ContentPreferencesData), detailTolerance: value })
                  }
                >
                  <SelectTrigger id="detail">
                    <SelectValue placeholder="Select detail level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Quick and simple</SelectItem>
                    <SelectItem value="medium">Medium - Balanced detail</SelectItem>
                    <SelectItem value="high">High - Deep dives welcome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="repetition">Repetition Preference</Label>
                <Select
                  value={(editData as ContentPreferencesData).repetitionPreference || ''}
                  onValueChange={(value) =>
                    setEditData({
                      ...(editData as ContentPreferencesData),
                      repetitionPreference: value,
                    })
                  }
                >
                  <SelectTrigger id="repetition">
                    <SelectValue placeholder="Select repetition level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Once is enough</SelectItem>
                    <SelectItem value="moderate">Moderate - Key points repeated</SelectItem>
                    <SelectItem value="frequent">Frequent - Multiple reinforcements</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const data = getPersonaData('contentPreferences') as ContentPreferencesData | null;
                return data ? (
                  <>
                    {data.density && (
                      <div>
                        <span className="text-sm text-muted-foreground">Content Density:</span>
                        <Badge variant="secondary" className="ml-2">
                          {data.density}
                        </Badge>
                      </div>
                    )}
                    {data.detailTolerance && (
                      <div>
                        <span className="text-sm text-muted-foreground">Detail Tolerance:</span>
                        <Badge variant="secondary" className="ml-2">
                          {data.detailTolerance}
                        </Badge>
                      </div>
                    )}
                    {data.repetitionPreference && (
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Repetition Preference:
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {data.repetitionPreference}
                        </Badge>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication Style
            </CardTitle>
            {editingSection !== 'communication' && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit('communication')}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSection === 'communication' ? (
            <>
              <div>
                <Label htmlFor="comm-style">Tone and Style</Label>
                <Select
                  value={(editData as CommunicationData).style || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as CommunicationData), style: value })
                  }
                >
                  <SelectTrigger id="comm-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNICATION_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="encouragement">Encouragement Level</Label>
                <Select
                  value={(editData as CommunicationData).encouragementLevel || ''}
                  onValueChange={(value) =>
                    setEditData({ ...(editData as CommunicationData), encouragementLevel: value })
                  }
                >
                  <SelectTrigger id="encouragement">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENCOURAGEMENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="humor">Include light humor?</Label>
                <Button
                  type="button"
                  variant={(editData as CommunicationData).humorAppropriate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setEditData({
                      ...(editData as CommunicationData),
                      humorAppropriate: !(editData as CommunicationData).humorAppropriate,
                    })
                  }
                >
                  {(editData as CommunicationData).humorAppropriate ? 'Yes' : 'No'}
                </Button>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const data = getPersonaData('communication') as CommunicationData | null;
                return data ? (
                  <>
                    {data.style && (
                      <div>
                        <span className="text-sm text-muted-foreground">Tone:</span>
                        <p className="font-medium capitalize">{data.style.replace('_', ' ')}</p>
                      </div>
                    )}
                    {data.encouragementLevel && (
                      <div>
                        <span className="text-sm text-muted-foreground">Encouragement:</span>
                        <Badge variant="secondary" className="ml-2">
                          {data.encouragementLevel}
                        </Badge>
                      </div>
                    )}
                    {data.humorAppropriate !== undefined && (
                      <div>
                        <span className="text-sm text-muted-foreground">Humor:</span>
                        <p className="font-medium">
                          {data.humorAppropriate ? 'Light humor welcome' : 'Keep it professional'}
                        </p>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
