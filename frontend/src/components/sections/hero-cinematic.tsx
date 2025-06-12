'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function HeroCinematic() {
  return (
    <section className="relative flex items-center justify-center py-32 bg-white">
      {/* TODO: Add cinematic product loop video background */}
      <div className="relative z-10 text-center max-w-3xl px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl font-semibold leading-tight"
        >
          Turn lecture slides
          <br />
          into personal AI tutors
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-xl text-neutral-600"
        >
          Upload a syllabus, get an on-demand chat TA—free while in beta.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/demo"
            className="inline-block mt-10 rounded-xl bg-blue-600 px-8 py-4 text-lg font-medium text-white shadow-md hover:bg-blue-700 hover:scale-[1.04] transition duration-200"
          >
            Try the live demo
          </Link>
        </motion.div>

        <motion.img
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          src="/macbook-placeholder.svg"
          alt="LEARN-X chat interface"
          className="relative z-10 mt-16 w-[760px] mx-auto rounded-xl shadow-2xl ring-1 ring-black/5"
        />
      </div>
    </section>
  );
}
