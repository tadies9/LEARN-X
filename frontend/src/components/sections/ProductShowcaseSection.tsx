'use client';

import Image from 'next/image';

import { motion } from 'framer-motion';

export function ProductShowcaseSection() {
  return (
    <section className="py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          {/* Simple Text */}
          <h2 className="text-3xl md:text-5xl font-light text-center mb-4">
            From upload to insight in 60 seconds
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-16 font-light">
            Watch how it works
          </p>

          {/* Product Demo Placeholder */}
          <div className="aspect-video bg-background rounded-lg shadow-2xl border overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 animate-pulse" />
                <p className="text-muted-foreground">Interactive demo coming soon</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
