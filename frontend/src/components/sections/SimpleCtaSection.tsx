'use client';

import Link from 'next/link';

import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';

export function SimpleCTASection() {
  return (
    <section className="py-32 bg-foreground text-background">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-light mb-8">
            Ready to transform your classroom?
          </h2>
          <p className="text-lg opacity-80 mb-12 font-light">
            Join our free beta and help shape the future of education
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base px-8 py-6 rounded-full">
              Get early access
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
