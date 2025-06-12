'use client';

import { motion } from 'framer-motion';
import { Zap, SearchCheck, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Zap,
    headline: 'Adaptive Quizzes',
    description: 'Built automatically from your content',
  },
  {
    icon: SearchCheck,
    headline: 'Source-Cited Answers',
    description: 'Every reply links back to the slide',
  },
  {
    icon: BarChart3,
    headline: 'Insight Dashboards',
    description: 'Spot topics students struggle with',
  },
];

export function FeatureTrio() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
                <feature.icon className="w-6 h-6 text-neutral-700" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.headline}</h3>
              <p className="text-neutral-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
