'use client';

import { motion } from 'framer-motion';
import { MessageCircle, BarChart3, Zap } from 'lucide-react';

const benefits = [
  {
    icon: MessageCircle,
    audience: 'FOR STUDENTS',
    headline: 'The _shortcut_ to understanding',
    description: 'Chat with any PDF. Get personalized help instantly.',
  },
  {
    icon: BarChart3,
    audience: 'FOR EDUCATORS',
    headline: 'The _x-ray_ vision into learning',
    description: 'See what students actually struggle with in real-time.',
  },
  {
    icon: Zap,
    audience: 'INSTANT SETUP',
    headline: 'The _60-second_ transformation',
    description: 'Upload → Deploy → Get insights. That simple.',
  },
];

export function BenefitsDualFacing() {
  return (
    <section className="py-32 bg-[#f8f9fa] pt-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-3 gap-12 lg:gap-24">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              {/* Audience Label */}
              <div className="text-xs font-medium text-[#86868b] tracking-wide uppercase mb-6">
                {benefit.audience}
              </div>

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 mb-8 rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
                <benefit.icon className="w-7 h-7 text-[#1d1d1f]" strokeWidth={1.5} />
              </div>

              {/* Headline with personality */}
              <h3
                className="text-2xl md:text-3xl font-semibold text-[#1d1d1f] mb-4 leading-tight"
                dangerouslySetInnerHTML={{
                  __html: benefit.headline.replace(
                    /_([^_]+)_/g,
                    '<em class="text-[#007aff] not-italic">$1</em>'
                  ),
                }}
              />

              {/* Description with proper spacing */}
              <p className="text-lg text-[#86868b] leading-relaxed pt-4">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
