import { MainHeader } from '@/components/navigation/MainHeader';
import { MainFooter } from '@/components/navigation/MainFooter';
import { HeroMain } from '@/components/sections/HeroMain';
import { FeaturesGrid } from '@/components/sections/FeaturesGrid';
import { VideoDemo } from '@/components/sections/VideoDemo';
import { CTAFinal } from '@/components/sections/CtaFinal';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A1628]">
      <MainHeader />

      <main>
        <HeroMain />
        <FeaturesGrid />
        <VideoDemo />
        <CTAFinal />
      </main>

      <MainFooter />
    </div>
  );
}
