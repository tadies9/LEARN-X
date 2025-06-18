import { heroConfigs } from '@/config/heroConfigs';

import { UnifiedHeroSection } from './UnifiedHeroSection';

export function HeroMain() {
  return <UnifiedHeroSection variant="main" content={heroConfigs.main} />;
}
