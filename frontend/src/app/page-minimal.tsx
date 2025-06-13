import { MainNav } from '@/components/navigation/main-nav-simple';
import { FooterMinimal } from '@/components/navigation/footer-minimal';
import { HeroSectionMinimal } from '@/components/sections/hero-section-minimal';
import { BetaProofSection } from '@/components/sections/beta-proof-section';
import { ProductShowcaseSection } from '@/components/sections/product-showcase-section';
import { SimpleFeaturesSection } from '@/components/sections/simple-features-section';
import { SimpleCTASection } from '@/components/sections/simple-cta-section';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main>
        <HeroSectionMinimal />
        <BetaProofSection />
        <ProductShowcaseSection />
        <SimpleFeaturesSection />
        <SimpleCTASection />
      </main>

      <FooterMinimal />
    </div>
  );
}
