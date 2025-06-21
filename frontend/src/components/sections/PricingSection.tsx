'use client';

import { useState } from 'react';
import Link from 'next/link';

import { motion } from 'framer-motion';
import { Check, X, Sparkles, Building2, Users } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { FadeIn } from '@/components/animations/FadeIn';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small schools and pilots',
    icon: Sparkles,
    monthlyPrice: 499,
    yearlyPrice: 399,
    features: [
      { name: 'Up to 100 students', included: true },
      { name: 'AI personalization', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Canvas integration', included: true },
      { name: 'Custom branding', included: false },
      { name: 'API access', included: false },
      { name: 'Dedicated support', included: false },
    ],
  },
  {
    name: 'Professional',
    description: 'For growing institutions',
    icon: Building2,
    monthlyPrice: 1999,
    yearlyPrice: 1599,
    popular: true,
    features: [
      { name: 'Up to 1,000 students', included: true },
      { name: 'AI personalization', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'All integrations', included: true },
      { name: 'Custom branding', included: true },
      { name: 'API access', included: true },
      { name: 'Dedicated support', included: false },
    ],
  },
  {
    name: 'Enterprise',
    description: 'For large institutions',
    icon: Users,
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    features: [
      { name: 'Unlimited students', included: true },
      { name: 'AI personalization', included: true },
      { name: 'Enterprise analytics', included: true },
      { name: '24/7 phone support', included: true },
      { name: 'All integrations', included: true },
      { name: 'White-label solution', included: true },
      { name: 'Full API access', included: true },
      { name: 'Dedicated success team', included: true },
    ],
  },
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);
  const [studentCount, setStudentCount] = useState([500]);

  const calculatePrice = (basePrice: number | string) => {
    if (typeof basePrice === 'string') return basePrice;
    const multiplier = Math.ceil(studentCount[0] / 100) * 0.1 + 0.9;
    return Math.round(basePrice * multiplier);
  };

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the perfect plan for your institution. All plans include our core AI features.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={!isYearly ? 'font-medium' : 'text-muted-foreground'}>Monthly</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={isYearly ? 'font-medium' : 'text-muted-foreground'}>
                Yearly
                <span className="ml-2 text-sm text-success font-medium">Save 20%</span>
              </span>
            </div>

            {/* Student Calculator */}
            <div className="max-w-md mx-auto mb-12">
              <label className="text-sm font-medium mb-2 block">
                How many students do you have?
              </label>
              <div className="flex items-center gap-4">
                <Slider
                  value={studentCount}
                  onValueChange={setStudentCount}
                  min={100}
                  max={5000}
                  step={100}
                  className="flex-1"
                />
                <span className="font-medium min-w-[80px] text-right">{studentCount[0]}</span>
              </div>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <FadeIn key={plan.name} delay={index * 0.1}>
              <motion.div whileHover={{ y: -5 }} className={plan.popular ? 'relative' : ''}>
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <Card className={`p-8 h-full ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                  <div className="text-center mb-6">
                    <plan.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold">
                      {typeof plan.monthlyPrice === 'string' ? (
                        plan.monthlyPrice
                      ) : (
                        <>
                          ${calculatePrice(isYearly ? plan.yearlyPrice : plan.monthlyPrice)}
                          <span className="text-base font-normal text-muted-foreground">
                            /month
                          </span>
                        </>
                      )}
                    </div>
                    {typeof plan.monthlyPrice === 'number' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on {studentCount[0]} students
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground/70'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.name === 'Enterprise' ? '/contact-sales' : '/register'}>
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      {plan.name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <div className="text-center mt-12">
            <p className="text-sm text-muted-foreground">
              All plans include a 30-day free trial. No credit card required.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
