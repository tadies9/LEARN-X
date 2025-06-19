export type HeroVariant = 'main' | 'tesla' | 'standard' | 'premium' | 'minimal' | 'cinematic';

export interface HeroContent {
  badge?: string;
  headline: string;
  subheading: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  notice?: string;
  image?: {
    src: string;
    alt: string;
  };
  video?: {
    thumbnail: string;
    source: string;
    captions?: string;
  };
  trustBadges?: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }>;
}

export interface UnifiedHeroSectionProps {
  variant: HeroVariant;
  content: HeroContent;
}
