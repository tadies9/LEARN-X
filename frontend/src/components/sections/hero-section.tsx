'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/animations/animated-counter';
import { FadeIn } from '@/components/animations/fade-in';
import { ArrowRight, Sparkles, Shield, Clock, School, BrainCircuit } from 'lucide-react';

const trustBadges = [
  { icon: Shield, label: 'FERPA Compliant' },
  { icon: Clock, label: 'Deploy in <5 min' },
  { icon: School, label: 'Canvas, Moodle, Blackboard' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-50 dark:from-primary/10 dark:to-blue-950/20" />
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

      <div className="container mx-auto px-4 py-24 text-center relative">
        <FadeIn>
          <motion.div
            className="inline-flex items-center rounded-full px-4 py-1.5 mb-8 text-sm bg-primary/10 text-primary border border-primary/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            60-second setup · WCAG AA verified · Zero hallucinations
          </motion.div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Turn every class into a{' '}
            </span>
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              personal AI tutor
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Upload any syllabus or lecture deck—students get chat-style help, professors get insight
            dashboards.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex justify-center mb-12">
            <Link href="/demo">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="xl" className="shadow-lg hover:shadow-xl transition-shadow">
                  Try the live demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-muted-foreground">
            {trustBadges.map((badge, index) => (
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
      </div>
    </section>
  );
}
