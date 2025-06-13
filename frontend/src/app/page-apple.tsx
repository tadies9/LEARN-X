import { NavUltraMinimal } from '@/components/navigation/nav-ultra-minimal';
import { FooterUltraMinimal } from '@/components/navigation/footer-ultra-minimal';
import { HeroCinematic } from '@/components/sections/hero-cinematic';
import { SixtySecondSection } from '@/components/sections/sixty-second-section';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <NavUltraMinimal />

      <main>
        {/* Hero takes full viewport */}
        <HeroCinematic />

        {/* Single content section with proper spacing */}
        <SixtySecondSection />

        {/* Alternating background */}
        <section className="py-24 bg-[#F9FAFB]">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-4xl font-semibold mb-8">Join the beta</h2>
            <p className="text-xl text-neutral-600 mb-10">
              Free during beta. No credit card required.
            </p>
            <a
              href="/signup"
              className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-medium text-white shadow-md hover:bg-blue-700 hover:scale-[1.04] transition duration-200"
            >
              Get started
            </a>
          </div>
        </section>
      </main>

      <FooterUltraMinimal />
    </div>
  );
}
