'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

export function VideoDemo() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="w-full py-16 md:py-24 bg-white dark:bg-[#0A1628]">
      <div className="container px-4 md:px-6">
        {/* Video Container - Clean and minimal */}
        <div className="max-w-3xl mx-auto">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800">
            {!showVideo ? (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={() => setShowVideo(true)}
              >
                {/* Video thumbnail or placeholder */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Play button */}
                <div className="relative z-10 w-20 h-20 rounded-full bg-white/95 dark:bg-white/90 group-hover:bg-white flex items-center justify-center transition-all transform group-hover:scale-110 shadow-lg">
                  <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                </div>
              </div>
            ) : (
              <video
                className="w-full h-full"
                controls
                autoPlay
                playsInline
                onLoadedData={() => setIsVideoLoaded(true)}
              >
                <source src="/intro-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
            
            {/* Temporary placeholder text - Remove when you add your video */}
            {!showVideo && (
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-white/70 text-sm">A message from the founder</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}