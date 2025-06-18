'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export function HeroTeslaStyle() {
  const [showVideo, setShowVideo] = useState(false);

  const handleVideoPlay = () => {
    setShowVideo(true);
    // Analytics tracking as specified
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: Function }).gtag) {
      (window as unknown as { gtag: Function }).gtag('event', 'video_play', {
        event_category: 'Hero Demo',
        event_label: 'Demo Video Started',
        value: 1,
      });
    }
  };

  const handleVideoEnd = () => {
    // Analytics tracking as specified
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: Function }).gtag) {
      (window as unknown as { gtag: Function }).gtag('event', 'video_complete', {
        event_category: 'Hero Demo',
        event_label: 'Demo Video Completed',
        value: 1,
      });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-4xl px-4">
        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-semibold leading-tight text-[#1d1d1f] mb-6"
        >
          Turn any PDF into
          <br className="hidden lg:block" />
          <span className="lg:hidden"> </span>your personal AI tutor
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-xl text-[#86868b] mb-10 max-w-2xl mx-auto"
        >
          Upload once. Chat instantly. Learn smarter.
        </motion.p>

        {/* Primary + Secondary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center items-center mb-16"
        >
          <Link href="/signup">
            <Button
              size="lg"
              className="rounded-xl bg-[#007aff] hover:bg-[#0056b3] px-8 py-4 text-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Get Started Free
            </Button>
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={handleVideoPlay}
            className="rounded-xl px-8 py-4 text-lg font-medium border-[#86868b] text-[#86868b] hover:text-[#1d1d1f] hover:border-[#1d1d1f] transition-all duration-200"
          >
            Watch Demo
          </Button>
        </motion.div>

        {/* Video Thumbnail with Play Button */}
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
              src="/demo-thumbnail.svg"
              alt="LEARN-X Demo - See how to upload and chat with PDFs"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              decoding="async"
              priority
              sizes="(max-width: 768px) 100vw, 800px"
            />

            {/* Play Button Overlay */}
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

        {/* Beta Notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm text-[#86868b] mt-8"
        >
          Free during beta • No credit card required
        </motion.p>
      </div>

      {/* Video Modal */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent
          className="max-w-4xl w-full h-auto p-0 bg-black border-0 focus:outline-none"
          aria-describedby="demo-video-description"
          aria-labelledby="demo-video-title"
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
              <source src="/learn-x-demo.mp4" type="video/mp4" />
              <track
                kind="captions"
                src="/learn-x-demo-captions.vtt"
                srcLang="en"
                label="English captions"
              />
              Your browser does not support the video tag.
            </video>

            {/* Close Button */}
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div id="demo-video-title" className="sr-only">
            LEARN-X Demo Video
          </div>
          <div id="demo-video-description" className="sr-only">
            Demo video showing how to upload PDFs and chat with LEARN-X AI tutor
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
