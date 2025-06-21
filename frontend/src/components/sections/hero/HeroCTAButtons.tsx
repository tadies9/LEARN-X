'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/animations/FadeIn';
import { HeroVariant, HeroContent } from './types';
import { getPrimaryCTAClass, getSecondaryCTAClass } from './styles';

interface HeroCTAButtonsProps {
  variant: HeroVariant;
  primaryCTA: HeroContent['primaryCTA'];
  secondaryCTA?: HeroContent['secondaryCTA'];
}

export function HeroCTAButtons({ variant, primaryCTA, secondaryCTA }: HeroCTAButtonsProps) {
  return (
    <FadeIn delay={0.3}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row gap-3 pt-2 justify-center items-center"
      >
        <Link href={primaryCTA.href}>
          <Button size="lg" className={getPrimaryCTAClass(variant)}>
            {primaryCTA.text}
            {variant === 'standard' && <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>
        </Link>

        {secondaryCTA && (
          <Button
            variant="outline"
            size="lg"
            onClick={
              secondaryCTA.onClick || (() => secondaryCTA.href && window.open(secondaryCTA.href))
            }
            className={getSecondaryCTAClass(variant)}
          >
            {secondaryCTA.text}
          </Button>
        )}
      </motion.div>
    </FadeIn>
  );
}
