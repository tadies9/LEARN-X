import { NavTeslaStyle } from '@/components/navigation/NavTeslaStyle';
import { FooterTeslaStyle } from '@/components/navigation/FooterTeslaStyle';
import { HeroTeslaStyle } from '@/components/sections/HeroTeslaStyle';
import { BenefitsDualFacing } from '@/components/sections/BenefitsDualFacing';
import { CTAMinimal } from '@/components/sections/CtaMinimal';

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
