import { MainNav } from '@/components/navigation/main-nav-simple';
import { FooterSingleLine } from '@/components/navigation/footer-single-line';
import { HeroSectionPremium } from '@/components/sections/hero-section-premium';
import { FeatureTicker } from '@/components/sections/feature-ticker';
import { SimpleFeaturesSection } from '@/components/sections/simple-features-section';
import { SimpleCTASection } from '@/components/sections/simple-cta-section';

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
