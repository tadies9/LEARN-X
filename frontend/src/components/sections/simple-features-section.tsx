'use client';

import { motion } from 'framer-motion';

const features = [
  {
    title: 'No templates',
    description: 'Every quiz is built from your actual course materials',
  },
  {
    title: 'Zero hallucinations',
    description: 'AI cites the exact slide and paragraph every time',
  },
  {
    title: 'Academic integrity',
    description: 'Watermarked answers and usage logs prevent misuse',
  },
];

export function SimpleFeaturesSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <h3 className="text-xl font-medium mb-4">{feature.title}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
