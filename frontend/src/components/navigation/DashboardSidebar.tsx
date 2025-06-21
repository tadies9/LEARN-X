'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  Users,
  FileText,
  Brain,
  Calendar,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Courses', href: '/courses', icon: BookOpen },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Learning Path', href: '/learning-path', icon: GraduationCap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Brain },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Resources', href: '/resources', icon: FileText },
  { name: 'Community', href: '/community', icon: Users },
];

const bottomNav = [
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'relative flex h-screen flex-col border-r bg-card',
        'transition-all duration-300'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Logo showText={!isCollapsed} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn('w-full justify-start', isCollapsed && 'justify-center px-2')}
                  >
                    <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="border-t p-3 space-y-2">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', isCollapsed && 'justify-center px-2')}
              >
                <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                {!isCollapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          );
        })}

        {/* Logout Button */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-destructive hover:text-destructive',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
