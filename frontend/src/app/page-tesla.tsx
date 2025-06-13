import { NavTeslaStyle } from '@/components/navigation/nav-tesla-style';
import { FooterTeslaStyle } from '@/components/navigation/footer-tesla-style';
import { HeroTeslaStyle } from '@/components/sections/hero-tesla-style';
import { BenefitsDualFacing } from '@/components/sections/benefits-dual-facing';
import { CTAMinimal } from '@/components/sections/cta-minimal';

export default function TeslaStylePage() {
  return (
    <div className="min-h-screen bg-white">
      <NavTeslaStyle />

      <main>
        {/* 1. Hero with Modal Video */}
        <HeroTeslaStyle />

        {/* 2. Dual-Audience Benefits */}
        <BenefitsDualFacing />

        {/* 3. Simple CTA */}
        <CTAMinimal />
      </main>

      <FooterTeslaStyle />
    </div>
  );
}
