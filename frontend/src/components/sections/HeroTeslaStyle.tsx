import { heroConfigs } from '@/config/heroConfigs';

import { UnifiedHeroSection } from './UnifiedHeroSection';

export function HeroTeslaStyle() {
  return <UnifiedHeroSection variant="tesla" content={heroConfigs.tesla} />;
}
