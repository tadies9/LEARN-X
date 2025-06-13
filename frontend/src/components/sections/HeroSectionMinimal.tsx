import { heroConfigs } from '@/config/heroConfigs';

import { UnifiedHeroSection } from './UnifiedHeroSection';

export function HeroSectionMinimal() {
  return (
    <UnifiedHeroSection
      variant="minimal"
      content={heroConfigs.minimal}
    />
  );
}
