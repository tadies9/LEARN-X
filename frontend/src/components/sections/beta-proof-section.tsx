'use client';

import { motion } from 'framer-motion';
import { Users, MessageSquare, FileText } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: '500+',
    label: 'Beta testers',
  },
  {
    icon: MessageSquare,
    value: '10,000+',
    label: 'AI conversations',
  },
  {
    icon: FileText,
    value: '1,000+',
    label: 'PDFs processed',
  },
];

export function BetaProofSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <stat.icon className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <div className="text-4xl font-light mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
