import { heroConfigs } from '@/config/heroConfigs';

import { UnifiedHeroSection } from './UnifiedHeroSection';

export function HeroCinematic() {
  return (
    <UnifiedHeroSection
      variant="cinematic"
      content={heroConfigs.cinematic}
    />
  );
}
