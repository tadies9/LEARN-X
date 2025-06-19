'use client';

import { motion } from 'framer-motion';
import { FadeIn } from '@/components/animations/FadeIn';
import { HeroContent } from './types';

interface HeroTrustBadgesProps {
  badges: HeroContent['trustBadges'];
}

export function HeroTrustBadges({ badges }: HeroTrustBadgesProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <FadeIn delay={0.4}>
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-6">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <badge.icon className="h-4 w-4 text-primary" />
            <span>{badge.label}</span>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}
