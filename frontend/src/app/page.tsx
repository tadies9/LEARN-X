import { MainHeader } from '@/components/navigation/main-header';
import { MainFooter } from '@/components/navigation/main-footer';
import { HeroMain } from '@/components/sections/hero-main';
import { TrustedBy } from '@/components/sections/trusted-by';
import { FeaturesGrid } from '@/components/sections/features-grid';
import { HowItWorks } from '@/components/sections/how-it-works';
import { ForEducators } from '@/components/sections/for-educators';
import { CTAFinal } from '@/components/sections/cta-final';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainHeader />

      <main>
        <HeroMain />
        <TrustedBy />
        <FeaturesGrid />
        <HowItWorks />
        <ForEducators />
        <CTAFinal />
      </main>

      <MainFooter />
    </div>
  );
}
