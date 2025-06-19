'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FadeIn } from '@/components/animations/FadeIn';

interface HeroBadgeProps {
  text: string;
}

export function HeroBadge({ text }: HeroBadgeProps) {
  return (
    <FadeIn>
      <motion.div
        className="inline-flex items-center rounded-full px-4 py-1.5 mb-8 text-sm bg-primary/15 dark:bg-primary/10 text-primary border border-primary/30 dark:border-primary/20"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {text}
      </motion.div>
    </FadeIn>
  );
}
