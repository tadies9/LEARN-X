'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { motion } from 'framer-motion';
import { Play, X, ArrowRight, ChevronDown, Sparkles, Shield, Clock, School } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FadeIn } from '@/components/animations/FadeIn';

export type HeroVariant = 
  | 'main' 
  | 'tesla' 
  | 'standard' 
  | 'premium' 
  | 'minimal' 
  | 'cinematic';

export interface HeroContent {
  badge?: string;
  headline: string;
  subheading: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  notice?: string;
  image?: {
    src: string;
    alt: string;
  };
  video?: {
    thumbnail: string;
    source: string;
    captions?: string;
  };
  trustBadges?: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }>;
}

interface UnifiedHeroSectionProps {
  variant: HeroVariant;
  content: HeroContent;
}

const variantStyles = {
  main: {
    section: 'relative w-full py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white to-gray-50 dark:from-[#0A1628] dark:to-[#0A1628]',
    container: 'container px-4 md:px-6',
    layout: 'grid gap-6 lg:grid-cols-2 lg:gap-12 items-center',
  },
  tesla: {
    section: 'relative min-h-screen flex items-center justify-center bg-white dark:bg-[#0A1628]',
    container: 'text-center max-w-4xl px-4',
    layout: 'space-y-8',
  },
  standard: {
    section: 'relative overflow-hidden bg-white dark:bg-[#0A1628]',
    container: 'container mx-auto px-4 py-24 text-center relative',
    layout: 'space-y-8',
  },
  premium: {
    section: 'relative isolate overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:bg-[#0A1628] pt-40 pb-28 px-4',
    container: 'mx-auto max-w-5xl',
    layout: 'space-y-8 text-center',
  },
  minimal: {
    section: 'relative min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0A1628]',
    container: 'text-center max-w-5xl mx-auto',
    layout: 'space-y-8',
  },
  cinematic: {
    section: 'relative flex items-center justify-center py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-[#0A1628]',
    container: 'relative z-10 text-center max-w-3xl px-4',
    layout: 'space-y-8',
  },
};

export function UnifiedHeroSection({ variant, content }: UnifiedHeroSectionProps) {
  const [showVideo, setShowVideo] = useState(false);
  const styles = variantStyles[variant];

  const handleVideoPlay = () => {
    setShowVideo(true);
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as Window & { gtag: (...args: unknown[]) => void }).gtag('event', 'video_play', {
        event_category: 'Hero Demo',
        event_label: 'Demo Video Started',
        value: 1,
      });
    }
  };

  const handleVideoEnd = () => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as Window & { gtag: (...args: unknown[]) => void }).gtag('event', 'video_complete', {
        event_category: 'Hero Demo',
        event_label: 'Demo Video Completed',
        value: 1,
      });
    }
  };

  const renderContent = () => (
    <>
      {content.badge && (
        <FadeIn>
          <motion.div
            className="inline-flex items-center rounded-full px-4 py-1.5 mb-8 text-sm bg-primary/15 dark:bg-primary/10 text-primary border border-primary/30 dark:border-primary/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {content.badge}
          </motion.div>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={getHeadlineClass(variant)}
          dangerouslySetInnerHTML={{ __html: content.headline }}
        />
      </FadeIn>

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

      <FadeIn delay={0.3}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-3 pt-2 justify-center items-center"
        >
          <Link href={content.primaryCTA.href}>
            <Button
              size="lg"
              className={getPrimaryCTAClass(variant)}
            >
              {content.primaryCTA.text}
              {variant === 'standard' && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </Link>

          {content.secondaryCTA && (
            <Button
              variant="outline"
              size="lg"
              onClick={content.secondaryCTA.onClick || (() => content.secondaryCTA?.href && window.open(content.secondaryCTA.href))}
              className={getSecondaryCTAClass(variant)}
            >
              {content.secondaryCTA.text}
            </Button>
          )}
        </motion.div>
      </FadeIn>

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

      {content.trustBadges && (
        <FadeIn delay={0.4}>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-6">
            {content.trustBadges.map((badge, index) => (
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
      )}
    </>
  );

  const renderMedia = () => {
    if (content.video) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative group cursor-pointer max-w-[800px] mx-auto w-full"
          onClick={handleVideoPlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleVideoPlay();
            }
          }}
          aria-label="Play demo video"
          style={{
            height: 'clamp(300px, 50vw, 450px)',
            aspectRatio: '16/9',
          }}
        >
          <div className="w-full h-full relative overflow-hidden rounded-xl shadow-lg shadow-black/10 ring-1 ring-black/5">
            <Image
              src={content.video.thumbnail}
              alt="Demo thumbnail"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
              sizes="(max-width: 768px) 100vw, 800px"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:bg-white/95"
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.15 }}
              >
                <Play className="w-6 h-6 text-[#1d1d1f] ml-1" fill="currentColor" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (content.image) {
      return (
        <div className="flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-card shadow-2xl">
            <Image
              src={content.image.src}
              alt={content.image.alt}
              width={600}
              height={400}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <section className={styles.section}>
      {renderBackgroundEffects(variant)}
      
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={variant === 'main' ? 'flex flex-col justify-center space-y-4' : ''}>
            {renderContent()}
          </div>
          
          {(content.image || content.video) && renderMedia()}
        </div>
      </div>

      {variant === 'minimal' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground" />
          </motion.div>
        </motion.div>
      )}

      {content.video && (
        <Dialog open={showVideo} onOpenChange={setShowVideo}>
          <DialogContent
            className="max-w-4xl w-full h-auto p-0 bg-black border-0 focus:outline-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="relative aspect-video">
              <video
                className="w-full h-full"
                controls
                autoPlay
                muted
                playsInline
                preload="none"
                onEnded={handleVideoEnd}
              >
                <source src={content.video.source} type="video/mp4" />
                {content.video.captions && (
                  <track
                    kind="captions"
                    src={content.video.captions}
                    srcLang="en"
                    label="English captions"
                  />
                )}
                Your browser does not support the video tag.
              </video>
              <button
                onClick={() => setShowVideo(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Close video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function renderBackgroundEffects(variant: HeroVariant) {
  if (variant === 'standard') {
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-100 dark:from-primary/10 dark:to-blue-950/20" />
        <motion.div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 4,
          }}
        />
      </div>
    );
  }
  return null;
}

function getHeadlineClass(variant: HeroVariant): string {
  const baseClasses = "font-bold mb-6";
  
  switch (variant) {
    case 'main':
      return `text-4xl ${baseClasses} tracking-tighter sm:text-5xl md:text-6xl text-primary dark:text-primary`;
    case 'tesla':
      return `text-5xl md:text-7xl ${baseClasses} font-semibold leading-tight text-gray-900 dark:text-white`;
    case 'standard':
      return `font-display text-5xl md:text-7xl ${baseClasses} bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent`;
    case 'premium':
      return `text-6xl md:text-7xl ${baseClasses} font-semibold tracking-tight text-gray-900 dark:text-white`;
    case 'minimal':
      return `text-5xl md:text-7xl lg:text-8xl ${baseClasses} font-normal tracking-tight text-gray-900 dark:text-white`;
    case 'cinematic':
      return `text-6xl ${baseClasses} font-semibold leading-tight`;
    default:
      return baseClasses;
  }
}

function getSubheadingClass(variant: HeroVariant): string {
  switch (variant) {
    case 'main':
      return "text-lg text-gray-600 dark:text-gray-400 md:text-xl max-w-[600px] mb-6";
    case 'tesla':
      return "text-xl text-gray-600 dark:text-[#86868b] mb-10 max-w-2xl mx-auto";
    case 'standard':
      return "text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto";
    case 'premium':
      return "mt-6 text-xl text-gray-600 dark:text-gray-400 font-normal";
    case 'minimal':
      return "text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 font-light";
    case 'cinematic':
      return "mt-6 text-xl text-gray-600 dark:text-gray-400";
    default:
      return "text-lg text-muted-foreground";
  }
}

function getPrimaryCTAClass(variant: HeroVariant): string {
  const baseClasses = "transition-all duration-200";
  
  switch (variant) {
    case 'main':
      return `${baseClasses} text-base`;
    case 'tesla':
      return `${baseClasses} rounded-xl bg-[#007aff] hover:bg-[#0056b3] px-8 py-4 text-lg font-medium shadow-md hover:shadow-lg`;
    case 'standard':
      return `${baseClasses} shadow-lg hover:shadow-xl transition-shadow`;
    case 'premium':
      return `${baseClasses} rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] hover:scale-[1.02] px-7 py-4 text-lg font-medium shadow-md text-white`;
    case 'minimal':
      return `${baseClasses} text-base px-8 py-6 rounded-full`;
    case 'cinematic':
      return `${baseClasses} rounded-xl hover:scale-[1.04] px-8 py-4 text-lg font-medium shadow-md`;
    default:
      return baseClasses;
  }
}

function getSecondaryCTAClass(variant: HeroVariant): string {
  const baseClasses = "transition-all duration-200";
  
  switch (variant) {
    case 'tesla':
      return `${baseClasses} rounded-xl px-8 py-4 text-lg font-medium border-[#86868b] text-[#86868b] hover:text-[#1d1d1f] hover:border-[#1d1d1f]`;
    default:
      return baseClasses;
  }
}