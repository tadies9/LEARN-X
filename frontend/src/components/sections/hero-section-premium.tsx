'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export function HeroSectionPremium() {
  return (
    <section className="relative isolate overflow-hidden bg-white pt-40 pb-28 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Text Content - Centered */}
        <div className="relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-7xl font-semibold tracking-tight text-[#0A0A0A]"
          >
            Turn lecture slides
            <br />
            into personal AI tutors
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-xl text-neutral-600 font-normal"
          >
            Upload any PDF. Students chat. You get insight dashboards.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex justify-center gap-4"
          >
            <Link
              href="/signup"
              className="rounded-xl bg-[#2563EB] px-7 py-4 text-white text-lg font-medium shadow-md hover:bg-[#1D4ED8] hover:scale-[1.02] transition-all duration-200"
            >
              Try it now
            </Link>
            <Link
              href="/demo"
              className="px-7 py-4 text-lg font-medium text-neutral-800 hover:text-[#2563EB] transition-colors duration-200"
            >
              Book founder demo →
            </Link>
          </motion.div>

          {/* Social Proof Line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-sm text-neutral-500"
          >
            Loved by 527 early testers • Rated 4.9/5 so far
          </motion.p>
        </div>

        {/* Product Visual - Centered Below Text */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-20 mx-auto max-w-4xl"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-50 to-gray-100">
            {/* MacBook Frame */}
            <div className="relative">
              {/* Browser Chrome */}
              <div className="bg-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded px-3 py-1 text-xs text-gray-600 w-64 text-center">
                    learn-x.ai/demo
                  </div>
                </div>
              </div>

              {/* App Content */}
              <div className="bg-white p-8 min-h-[500px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl mx-auto animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-36 mx-auto animate-pulse" />
                  </div>
                  <div className="pt-4">
                    <div className="h-10 bg-blue-100 rounded-lg w-32 mx-auto animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Depth Shadow */}
          <div className="absolute inset-0 -z-10 transform translate-y-8 opacity-25 blur-2xl">
            <div className="h-full w-full rounded-2xl bg-gradient-to-b from-gray-300 to-gray-400" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
