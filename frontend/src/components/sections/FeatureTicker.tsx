'use client';

import { motion } from 'framer-motion';

const features = [
  'Zero hallucinations',
  'WCAG AA verified',
  'Private beta—free',
  'Built on OpenAI RAG',
  'FERPA-ready',
  '<3-sec answers',
  'No templates',
  'Academic integrity built-in',
];

export function FeatureTicker() {
  return (
    <div className="bg-neutral-50 py-4 overflow-hidden">
      <div className="relative">
        <motion.div
          animate={{
            x: ['0%', '-50%'],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 30,
              ease: 'linear',
            },
          }}
          className="flex"
        >
          {/* Duplicate the features array for seamless loop */}
          {[...features, ...features].map((feature, index) => (
            <span
              key={index}
              className="text-sm uppercase tracking-wide text-neutral-700 mx-8 whitespace-nowrap"
            >
              {feature}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
