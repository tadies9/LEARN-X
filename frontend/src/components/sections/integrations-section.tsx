'use client';

import { motion } from 'framer-motion';
import { FadeIn } from '@/components/animations/fade-in';

const integrations = [
  { name: 'Canvas', logo: '🎨' },
  { name: 'Blackboard', logo: '⬛' },
  { name: 'Google Classroom', logo: '🎓' },
  { name: 'Microsoft Teams', logo: '💼' },
  { name: 'Zoom', logo: '📹' },
  { name: 'Moodle', logo: '📚' },
];

export function IntegrationsSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              TRUSTED BY LEADING INSTITUTIONS
            </h2>
            <p className="text-2xl font-semibold">Seamlessly integrates with your existing tools</p>
          </div>
        </FadeIn>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10" />
          <motion.div
            className="flex gap-8 items-center"
            animate={{
              x: [0, -1000],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 20,
                ease: 'linear',
              },
            }}
          >
            {[...integrations, ...integrations].map((integration, index) => (
              <motion.div
                key={`${integration.name}-${index}`}
                className="flex items-center gap-3 px-6 py-4 bg-card border rounded-lg shadow-sm min-w-[180px]"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <span className="text-3xl">{integration.logo}</span>
                <span className="font-medium text-lg">{integration.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
