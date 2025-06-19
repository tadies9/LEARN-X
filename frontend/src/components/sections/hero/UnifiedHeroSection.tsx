'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FadeIn } from '@/components/animations/FadeIn';
import { UnifiedHeroSectionProps } from './types';
import { variantStyles, getSubheadingClass } from './styles';
import { HeroBadge } from './HeroBadge';
import { HeroHeadline } from './HeroHeadline';
import { HeroCTAButtons } from './HeroCTAButtons';
import { HeroTrustBadges } from './HeroTrustBadges';
import { HeroVideoPlayer } from './HeroVideoPlayer';

export function UnifiedHeroSection({ variant, content }: UnifiedHeroSectionProps) {
  const renderContent = () => (
    <>
      {content.badge && <HeroBadge text={content.badge} />}

      <HeroHeadline variant={variant} headline={content.headline} />

      <FadeIn delay={0.2}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={getSubheadingClass(variant)}
        >
          {content.subheading}
        </motion.p>
      </FadeIn>

      <HeroCTAButtons
        variant={variant}
        primaryCTA={content.primaryCTA}
        secondaryCTA={content.secondaryCTA}
      />

      {content.notice && (
        <FadeIn delay={0.4}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-sm text-gray-500 dark:text-gray-500 mt-4"
          >
            {content.notice}
          </motion.p>
        </FadeIn>
      )}

      <HeroTrustBadges badges={content.trustBadges} />
    </>
  );

  const renderCinematicOverlay = () => {
    if (variant !== 'cinematic') return null;

    return (
      <>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-blue-600/20" />
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 2 }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px w-32 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
              initial={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0,
              }}
              animate={{
                opacity: [0, 0.5, 0],
                left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear',
                delay: Math.random() * 5,
              }}
            />
          ))}
        </motion.div>
      </>
    );
  };

  // Different layouts based on variant
  if (variant === 'tesla') {
    return (
      <section
        className={`relative min-h-screen flex items-center justify-center ${variantStyles[variant]}`}
      >
        <div className="relative z-10 container mx-auto px-4 text-center">
          {renderContent()}
          {content.video && (
            <div className="mt-16">
              <HeroVideoPlayer video={content.video} />
            </div>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'cinematic') {
    return (
      <section
        className={`relative min-h-screen flex items-center justify-center ${variantStyles[variant]}`}
      >
        {renderCinematicOverlay()}
        <div className="relative z-10 container mx-auto px-4 text-center">{renderContent()}</div>
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-white/60" />
        </motion.div>
      </section>
    );
  }

  // Default layout
  return (
    <section className={`relative py-24 md:py-32 ${variantStyles[variant]}`}>
      <div className="container mx-auto px-4">
        <div className="text-center">{renderContent()}</div>
        {content.video && (
          <div className="mt-16">
            <HeroVideoPlayer video={content.video} />
          </div>
        )}
      </div>
    </section>
  );
}
