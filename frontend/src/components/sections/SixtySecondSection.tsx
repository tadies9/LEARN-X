'use client';

import { motion } from 'framer-motion';
import { Zap, Search, BarChart3 } from 'lucide-react';

export function SixtySecondSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h2 className="text-4xl font-semibold mb-8">Syllabus in — insights out in seconds</h2>
          <ul className="space-y-5 text-lg text-neutral-700">
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-neutral-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>Adaptive quizzes from your slides</span>
            </li>
            <li className="flex items-start gap-3">
              <Search className="w-5 h-5 text-neutral-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>Answers cite the exact source file</span>
            </li>
            <li className="flex items-start gap-3">
              <BarChart3
                className="w-5 h-5 text-neutral-600 mt-0.5 flex-shrink-0"
                strokeWidth={2}
              />
              <span>Instructor dashboard highlights knowledge gaps</span>
            </li>
          </ul>
          <a
            href="/demo"
            className="inline-block mt-8 text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-4 transition-colors"
          >
            Book founder demo →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
