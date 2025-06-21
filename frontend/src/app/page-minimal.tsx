import { MainNav } from '@/components/navigation/MainNavSimple';
import { FooterMinimal } from '@/components/navigation/FooterMinimal';
import { HeroSectionMinimal } from '@/components/sections/HeroSectionMinimal';
import { BetaProofSection } from '@/components/sections/BetaProofSection';
import { ProductShowcaseSection } from '@/components/sections/ProductShowcaseSection';
import { SimpleFeaturesSection } from '@/components/sections/SimpleFeaturesSection';
import { SimpleCTASection } from '@/components/sections/SimpleCtaSection';

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
