import { heroConfigs } from '@/config/heroConfigs';

import { UnifiedHeroSection } from './UnifiedHeroSection';

export function HeroSectionPremium() {
  return (
    <UnifiedHeroSection
      variant="premium"
      content={heroConfigs.premium}
    />
  );
}
