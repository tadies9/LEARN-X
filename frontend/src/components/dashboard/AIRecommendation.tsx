import { Brain, Target } from 'lucide-react';
import { useMemo } from 'react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/animations/FadeIn';
import { usePersona, usePersonaInterests } from '@/hooks/usePersona';
import { useDashboardData } from '@/hooks/useDashboardData';

// Recommendation mappings based on interests and current progress
const INTEREST_RECOMMENDATIONS = {
  'web development': ['React', 'Next.js', 'Node.js', 'TypeScript', 'REST APIs'],
  'mobile development': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Mobile UI/UX'],
  'data science': ['Python', 'Pandas', 'Machine Learning', 'Statistics', 'Data Visualization'],
  'cloud computing': ['AWS', 'Docker', 'Kubernetes', 'Serverless', 'CI/CD'],
  'ai/ml': ['Neural Networks', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP'],
  'cybersecurity': ['Network Security', 'Cryptography', 'Ethical Hacking', 'Security Auditing'],
  'game development': ['Unity', 'Unreal Engine', 'Game Design', '3D Modeling', 'Physics'],
  'blockchain': ['Smart Contracts', 'Solidity', 'DeFi', 'Web3', 'Cryptography'],
};

export function AIRecommendation() {
  const { persona } = usePersona();
  const interests = usePersonaInterests();
  const { recentCourses } = useDashboardData();
  
  const recommendation = useMemo(() => {
    // Default recommendation if no persona
    if (!persona || interests.length === 0) {
      return {
        topic: "JavaScript Fundamentals",
        reason: "Start with the basics to build a strong foundation."
      };
    }
    
    // Get primary interest
    const primaryInterest = interests[0]?.toLowerCase() || 'web development';
    
    // Find relevant topics based on interest
    const relevantTopics = Object.entries(INTEREST_RECOMMENDATIONS)
      .filter(([key]) => primaryInterest.includes(key) || key.includes(primaryInterest))
      .flatMap(([_, topics]) => topics);
    
    // Filter out topics from recent courses
    const recentTopics = recentCourses.map(course => course.title.toLowerCase());
    const availableTopics = relevantTopics.filter(
      topic => !recentTopics.some(recent => recent.includes(topic.toLowerCase()))
    );
    
    // Pick a recommendation
    const recommendedTopic = availableTopics[0] || relevantTopics[0] || 'Advanced JavaScript';
    
    // Generate reason based on experience level
    const experienceLevel = persona.professional_context?.experienceYears || 0;
    let reason = '';
    
    if (experienceLevel < 2) {
      reason = `Perfect for building your ${primaryInterest} skills at your current level.`;
    } else if (experienceLevel < 5) {
      reason = `Advance your ${primaryInterest} expertise with industry-standard practices.`;
    } else {
      reason = `Master advanced ${primaryInterest} concepts to stay ahead in your field.`;
    }
    
    return { topic: recommendedTopic, reason };
  }, [persona, interests, recentCourses]);

  return (
    <FadeIn delay={0.8}>
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Recommended Next</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Consider exploring <strong>{recommendation.topic}</strong>. {recommendation.reason}
            </p>
            <Button size="sm">
              <Target className="h-4 w-4 mr-2" />
              Explore {recommendation.topic}
            </Button>
          </div>
        </div>
      </Card>
    </FadeIn>
  );
}