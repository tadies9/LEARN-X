import { MainHeader } from '@/components/navigation/MainHeader';
import { MainFooter } from '@/components/navigation/MainFooter';
import { HeroMain } from '@/components/sections/HeroMain';
import { TrustedBy } from '@/components/sections/TrustedBy';
import { FeaturesGrid } from '@/components/sections/FeaturesGrid';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ForEducators } from '@/components/sections/ForEducators';
import { CTAFinal } from '@/components/sections/CtaFinal';

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
