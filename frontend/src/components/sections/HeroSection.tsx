import { heroConfigs } from '@/config/heroConfigs';

import { UnifiedHeroSection } from './UnifiedHeroSection';

export function HeroSection() {
  return <UnifiedHeroSection variant="standard" content={heroConfigs.standard} />;
}
