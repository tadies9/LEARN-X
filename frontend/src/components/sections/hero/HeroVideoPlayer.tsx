'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { HeroContent } from './types';

interface HeroVideoPlayerProps {
  video: HeroContent['video'];
}

export function HeroVideoPlayer({ video }: HeroVideoPlayerProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  if (!video) return null;

  const handleVideoPlay = () => {
    setIsVideoOpen(true);

    // Track video play event
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

  return (
    <>
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
            src={video.thumbnail}
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
              <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black">
          <button
            onClick={() => setIsVideoOpen(false)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Close video"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="relative aspect-video w-full">
            <video
              src={video.source}
              className="h-full w-full"
              controls
              autoPlay
              onEnded={handleVideoEnd}
            >
              {video.captions && (
                <track src={video.captions} kind="captions" srcLang="en" label="English" default />
              )}
              Your browser does not support the video tag.
            </video>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
