'use client';

import Link from 'next/link';

import { motion } from 'framer-motion';

export function BetaInvitation() {
  return (
    <section className="py-32 bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-4xl font-semibold mb-6">Be part of the private beta</h2>
          <p className="text-xl text-neutral-600 mb-10">
            Free while we refine the product. No credit card.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-medium text-white shadow-md hover:bg-blue-700 hover:scale-[1.04] transition duration-200"
          >
            Get early access
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
