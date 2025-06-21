'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/NavigationMenu';
import { ThemeToggle } from '@/components/navigation/ThemeToggle';
import {
  BookOpen,
  Brain,
  Users,
  BarChart3,
  Shield,
  Zap,
  GraduationCap,
  Building2,
} from 'lucide-react';

const features = [
  {
    title: 'AI-Powered Personalization',
    href: '/features/ai-personalization',
    description: "Content that adapts to each learner's unique style and interests",
    icon: Brain,
  },
  {
    title: 'Interactive Course Materials',
    href: '/features/interactive-content',
    description: 'Transform any PDF into engaging, personalized learning modules',
    icon: BookOpen,
  },
  {
    title: 'Progress Analytics',
    href: '/features/analytics',
    description: 'Detailed insights into student learning journeys',
    icon: BarChart3,
  },
  {
    title: 'Anti-Cheating Technology',
    href: '/features/security',
    description: 'Maintain academic integrity with advanced monitoring',
    icon: Shield,
  },
];

const solutions = [
  {
    title: 'For K-12 Schools',
    href: '/solutions/k12',
    description: 'Empower young learners with personalized education',
    icon: GraduationCap,
  },
  {
    title: 'For Universities',
    href: '/solutions/higher-ed',
    description: 'Scale personalized learning across your institution',
    icon: Building2,
  },
  {
    title: 'For Educators',
    href: '/solutions/educators',
    description: 'Tools to create and manage personalized content',
    icon: Users,
  },
  {
    title: 'For Students',
    href: '/solutions/students',
    description: 'Learn faster with AI that understands you',
    icon: Zap,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center">
        <Logo showText={false} width={60} height={60} />

        <NavigationMenu className="hidden md:flex mx-6">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Features</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[600px] gap-3 p-4 md:grid-cols-2">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <li key={feature.href}>
                        <NavigationMenuLink asChild>
                          <a
                            href={feature.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <div className="text-sm font-medium leading-none">
                                {feature.title}
                              </div>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {feature.description}
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[600px] gap-3 p-4 md:grid-cols-2">
                  {solutions.map((solution) => {
                    const Icon = solution.icon;
                    return (
                      <li key={solution.href}>
                        <NavigationMenuLink asChild>
                          <a
                            href={solution.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <div className="text-sm font-medium leading-none">
                                {solution.title}
                              </div>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {solution.description}
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/pricing" legacyBehavior passHref>
                <NavigationMenuLink
                  className={cn(
                    'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50',
                    pathname === '/pricing' && 'bg-accent text-accent-foreground'
                  )}
                >
                  Pricing
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/resources" legacyBehavior passHref>
                <NavigationMenuLink
                  className={cn(
                    'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50',
                    pathname === '/resources' && 'bg-accent text-accent-foreground'
                  )}
                >
                  Resources
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
