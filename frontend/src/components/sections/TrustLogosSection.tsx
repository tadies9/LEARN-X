'use client';

import { motion } from 'framer-motion';
import { Building2, GraduationCap, School } from 'lucide-react';

import { FadeIn } from '@/components/animations/FadeIn';

const institutions = [
  { name: 'Iowa State University', type: 'university', stat: '+37 ppt quiz scores' },
  { name: 'Stanford Online', type: 'university', stat: '94% completion rate' },
  { name: 'Ames Community Schools', type: 'k12', stat: '2.3x engagement' },
  { name: 'UC Berkeley Extension', type: 'university', stat: '89% recommend' },
  { name: 'Chicago Public Schools', type: 'k12', stat: '45min saved/day' },
];

export function TrustLogosSection() {
  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <FadeIn>
          <p className="text-center text-sm font-medium text-muted-foreground mb-8">
            TRUSTED BY LEADING INSTITUTIONS
          </p>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center">
          {institutions.map((institution, index) => (
            <FadeIn key={institution.name} delay={index * 0.1}>
              <motion.div
                className="flex flex-col items-center text-center group"
                whileHover={{ y: -5 }}
              >
                <div className="w-16 h-16 bg-background rounded-lg shadow-sm border flex items-center justify-center mb-3 group-hover:shadow-md transition-shadow">
                  {institution.type === 'university' ? (
                    <GraduationCap className="h-8 w-8 text-primary" />
                  ) : institution.type === 'k12' ? (
                    <School className="h-8 w-8 text-primary" />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <p className="text-sm font-medium mb-1">{institution.name}</p>
                <p className="text-xs text-muted-foreground">{institution.stat}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.6}>
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">2M+ students</span> learning smarter,
              not harder
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
