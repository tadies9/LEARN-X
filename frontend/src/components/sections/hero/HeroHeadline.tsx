'use client';

import { motion } from 'framer-motion';
import { FadeIn } from '@/components/animations/FadeIn';
import { HeroVariant } from './types';
import { getHeadlineClass } from './styles';

interface HeroHeadlineProps {
  variant: HeroVariant;
  headline: string;
}

export function HeroHeadline({ variant, headline }: HeroHeadlineProps) {
  return (
    <FadeIn delay={0.1}>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={getHeadlineClass(variant)}
        dangerouslySetInnerHTML={{ __html: headline }}
      />
    </FadeIn>
  );
}
