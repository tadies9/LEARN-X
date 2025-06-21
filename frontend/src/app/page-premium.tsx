import { MainNav } from '@/components/navigation/MainNavSimple';
import { FooterSingleLine } from '@/components/navigation/FooterSingleLine';
import { HeroSectionPremium } from '@/components/sections/HeroSectionPremium';
import { FeatureTicker } from '@/components/sections/FeatureTicker';
import { SimpleFeaturesSection } from '@/components/sections/SimpleFeaturesSection';
import { SimpleCTASection } from '@/components/sections/SimpleCtaSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainNav />

      <main>
        <HeroSectionPremium />
        <FeatureTicker />

        {/* Features with proper 96pt spacing */}
        <div className="pt-24">
          <SimpleFeaturesSection />
        </div>

        <SimpleCTASection />
      </main>

      <FooterSingleLine />
    </div>
  );
}
