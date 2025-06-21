'use client';

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/animations/FadeIn';

const testimonials = [
  {
    id: 1,
    name: 'Dr. Sarah Johnson',
    role: 'Dean of Education',
    institution: 'Stanford University',
    content:
      "LEARN-X has revolutionized how we deliver personalized education. Our students' engagement rates have increased by 73% since implementation.",
    avatar: '👩‍🏫',
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'High School Principal',
    institution: 'Lincoln High School',
    content:
      'The AI-powered personalization has been a game-changer for our diverse student body. Every learner gets content that speaks their language.',
    avatar: '👨‍💼',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Student',
    institution: 'UC Berkeley',
    content:
      "I'm a visual learner who loves basketball. LEARN-X explains complex CS concepts using basketball analogies. It just clicks!",
    avatar: '👩‍🎓',
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Loved by educators and students
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how LEARN-X is transforming education across institutions worldwide
            </p>
          </div>
        </FadeIn>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 md:p-12 relative">
                  <Quote className="absolute top-8 left-8 h-8 w-8 text-primary/20" />
                  <div className="flex flex-col items-center text-center">
                    <div className="text-6xl mb-6">{testimonials[currentIndex].avatar}</div>
                    <p className="text-lg md:text-xl mb-6 italic">
                      "{testimonials[currentIndex].content}"
                    </p>
                    <div>
                      <h4 className="font-semibold text-lg">{testimonials[currentIndex].name}</h4>
                      <p className="text-muted-foreground">
                        {testimonials[currentIndex].role} • {testimonials[currentIndex].institution}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between items-center mt-8">
              <Button variant="ghost" size="icon" onClick={handlePrevious} className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              <Button variant="ghost" size="icon" onClick={handleNext} className="rounded-full">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
