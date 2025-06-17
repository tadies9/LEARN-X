import { Shield, Clock, School } from 'lucide-react';

import type { HeroContent } from '@/components/sections/UnifiedHeroSection';

export const heroConfigs: Record<string, HeroContent> = {
  main: {
    badge: 'AI-POWERED EDUCATION PLATFORM',
    headline: 'A personal tutor that adapts to you!',
    subheading: 'Upload your class materials once—our AI turns them into bite-sized lessons, examples, and quizzes built around your interests, pace, and goals.',
    primaryCTA: {
      text: 'Book a 15-min Demo',
      href: 'mailto:tadiwa@learn-x.co?subject=Demo Request - LEARN-X&body=Hi,%0A%0AI\'d like to schedule a 15-minute demo of LEARN-X.%0A%0AMy availability:%0A-%20%0A-%20%0A%0AThanks!',
    },
    notice: '',
    image: {
      src: '/images/dashboard-screenshot.png',
      alt: 'Learn-X Dashboard showing Canvas material being transformed into personalized learning content',
    },
  },

  tesla: {
    headline: 'Turn any PDF into<br className="hidden lg:block" /><span className="lg:hidden"> </span>your personal AI tutor',
    subheading: 'Upload once. Chat instantly. Learn smarter.',
    primaryCTA: {
      text: 'Get Started Free',
      href: '/signup',
    },
    secondaryCTA: {
      text: 'Watch Demo',
      onClick: () => {}, // Will be handled by component
    },
    notice: 'Free during beta',
    video: {
      thumbnail: '/demo-thumbnail.svg',
      source: '/learn-x-demo.mp4',
      captions: '/learn-x-demo-captions.vtt',
    },
  },

  standard: {
    badge: '60-second setup · WCAG AA verified · Zero hallucinations',
    headline: 'Turn every class into a <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">personal AI tutor</span>',
    subheading: 'Upload any syllabus or lecture deck—students get chat-style help, professors get insight dashboards.',
    primaryCTA: {
      text: 'Try the live demo',
      href: 'mailto:tadiwa@learn-x.co?subject=Demo Request - LEARN-X&body=Hi,%0A%0AI\'d like to schedule a 15-minute demo of LEARN-X.%0A%0AMy availability:%0A-%20%0A-%20%0A%0AThanks!',
    },
    trustBadges: [
      { icon: Shield, label: 'Secure & Private' },
      { icon: Clock, label: 'Deploy in <5 min' },
      { icon: School, label: 'Canvas, Moodle, Blackboard' },
    ],
  },

  premium: {
    headline: 'Turn lecture slides<br />into personal AI tutors',
    subheading: 'Upload any PDF. Students chat. You get insight dashboards.',
    primaryCTA: {
      text: 'Try it now',
      href: '/signup',
    },
    secondaryCTA: {
      text: 'Book founder demo →',
      href: 'mailto:tadiwa@learn-x.co?subject=Demo Request - LEARN-X&body=Hi,%0A%0AI\'d like to schedule a 15-minute demo of LEARN-X.%0A%0AMy availability:%0A-%20%0A-%20%0A%0AThanks!',
    },
    notice: 'Loved by 527 early testers • Rated 4.9/5 so far',
  },

  minimal: {
    headline: 'Turn lecture slides into<br />personal AI tutors',
    subheading: 'Upload any PDF. Students chat with it. You get insights.',
    primaryCTA: {
      text: 'Try it now',
      href: 'mailto:tadiwa@learn-x.co?subject=Demo Request - LEARN-X&body=Hi,%0A%0AI\'d like to schedule a 15-minute demo of LEARN-X.%0A%0AMy availability:%0A-%20%0A-%20%0A%0AThanks!',
    },
    notice: 'Free during beta',
  },

  cinematic: {
    headline: 'Turn lecture slides<br />into personal AI tutors',
    subheading: 'Upload a syllabus, get an on-demand chat TA—free while in beta.',
    primaryCTA: {
      text: 'Try the live demo',
      href: 'mailto:tadiwa@learn-x.co?subject=Demo Request - LEARN-X&body=Hi,%0A%0AI\'d like to schedule a 15-minute demo of LEARN-X.%0A%0AMy availability:%0A-%20%0A-%20%0A%0AThanks!',
    },
    image: {
      src: '/macbook-placeholder.svg',
      alt: 'LEARN-X chat interface',
    },
  },
};