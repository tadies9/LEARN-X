'use client';

import Link from 'next/link';

import { motion } from 'framer-motion';

import { Button } from '@/components/ui/Button';

export function CTAMinimal() {
  return (
    <section className="py-28 md:py-32 bg-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[#1d1d1f] mb-8 leading-tight">
            Ready to get started?
          </h2>

          <p className="text-xl text-[#86868b] mb-12 leading-relaxed">
            Join our free beta and transform how learning happens.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="rounded-xl bg-[#007aff] hover:bg-[#0056b3] px-8 py-4 text-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                Get Started Free
              </Button>
            </Link>

            <Link
              href="/demo"
              className="text-gray-600 hover:text-[#1d1d1f] text-lg font-medium transition-colors duration-200 hover:underline underline-offset-4"
            >
              Schedule Demo <span className="opacity-60">→</span>
            </Link>
          </div>

          <p className="text-sm text-[#86868b] mt-8">No credit card required</p>
        </motion.div>
      </div>
    </section>
  );
}
