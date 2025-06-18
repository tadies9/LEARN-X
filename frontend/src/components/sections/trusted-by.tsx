import Image from 'next/image';

export function TrustedBy() {
  return (
    <section className="w-full py-8 border-b border-gray-100">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            TRUSTED BY LEADING EDUCATORS
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 py-4">
            <Image
              src="/images/partner-logo.svg"
              alt="Partner Institution"
              width={120}
              height={60}
              className="h-12 w-auto"
            />
          </div>
          <div className="flex items-center justify-center">
            <a
              href="/case-study.pdf"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
              aria-label="View our pilot results case study"
            >
              See pilot results →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
