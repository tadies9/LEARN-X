'use client';

// 1. React/Next imports
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 2. Third-party libraries
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Settings,
  Brain,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Target,
  Library,
  Upload,
  GraduationCap,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 3. Internal imports - absolute paths (@/)
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAuth } from '@/hooks/useAuth';

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, locked: false },
  { name: 'My Courses', href: '/courses', icon: GraduationCap, locked: false },
  { name: 'Upload Content', href: '/upload', icon: Upload, locked: true },
  { name: 'Study Sessions', href: '/study', icon: BookOpen, locked: true },
  { name: 'My Library', href: '/library', icon: Library, locked: true },
  { name: 'AI Tutor', href: '/ai-tutor', icon: Brain, locked: true },
  { name: 'Progress', href: '/progress', icon: Target, locked: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, locked: true },
];

const BOTTOM_NAV = [
  { name: 'Help & Support', href: '/help', icon: HelpCircle, locked: true },
  { name: 'Settings', href: '/settings', icon: Settings, locked: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'relative flex h-screen flex-col border-r',
        'bg-white dark:bg-card',
        'border-gray-200 dark:border-border',
        'transition-all duration-300'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-20 items-center justify-between border-b border-gray-200 dark:border-border px-4 bg-gray-50 dark:bg-background">
        <div
          className={cn(
            'flex items-center transition-all duration-300',
            isCollapsed ? 'justify-center w-full' : ''
          )}
        >
          <Logo
            showText={!isCollapsed}
            width={isCollapsed ? 40 : 56}
            height={isCollapsed ? 40 : 56}
            className="min-w-fit"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800',
            isCollapsed ? 'absolute right-2' : 'ml-auto'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {NAVIGATION.map((item) => {
            const isActive = pathname === item.href;
            const NavContent = (
              <motion.div
                whileHover={!item.locked ? { scale: 1.02 } : {}}
                whileTap={!item.locked ? { scale: 0.98 } : {}}
              >
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start relative',
                    isCollapsed && 'justify-center px-2',
                    item.locked && 'opacity-50 cursor-not-allowed',
                    !isActive && 'hover:bg-gray-100 dark:hover:bg-gray-800',
                    !isActive && !item.locked && 'text-gray-700 dark:text-gray-300'
                  )}
                  disabled={item.locked}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5',
                      !isCollapsed && 'mr-3',
                      isActive ? '' : 'text-gray-600 dark:text-gray-400'
                    )}
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'overflow-hidden whitespace-nowrap',
                          isActive ? '' : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.locked && (
                    <Lock
                      className={cn(
                        'h-3 w-3 absolute',
                        isCollapsed ? 'right-1 top-1' : 'right-3',
                        'text-gray-500 dark:text-gray-500'
                      )}
                    />
                  )}
                </Button>
              </motion.div>
            );

            return item.locked ? (
              <div key={item.name} className="cursor-not-allowed">
                {NavContent}
              </div>
            ) : (
              <Link key={item.name} href={item.href}>
                {NavContent}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 dark:border-border p-3 space-y-2 bg-gray-50 dark:bg-background">
        {BOTTOM_NAV.map((item) => {
          const isActive = pathname === item.href;
          const NavContent = (
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start relative',
                isCollapsed && 'justify-center px-2',
                item.locked && 'opacity-50 cursor-not-allowed',
                !isActive && 'hover:bg-gray-100 dark:hover:bg-gray-800',
                !isActive && !item.locked && 'text-gray-700 dark:text-gray-300'
              )}
              disabled={item.locked}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  !isCollapsed && 'mr-3',
                  isActive ? '' : 'text-gray-600 dark:text-gray-400'
                )}
              />
              {!isCollapsed && (
                <span
                  className={cn(
                    'whitespace-nowrap',
                    isActive ? '' : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {item.name}
                </span>
              )}
              {item.locked && (
                <Lock
                  className={cn(
                    'h-3 w-3 absolute',
                    isCollapsed ? 'right-1 top-1' : 'right-3',
                    'text-gray-500 dark:text-gray-500'
                  )}
                />
              )}
            </Button>
          );

          return item.locked ? (
            <div key={item.name} className="cursor-not-allowed">
              {NavContent}
            </div>
          ) : (
            <Link key={item.name} href={item.href}>
              {NavContent}
            </Link>
          );
        })}

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full justify-start',
            'text-red-600 dark:text-red-400',
            'hover:bg-red-50 dark:hover:bg-red-950',
            'hover:text-red-700 dark:hover:text-red-300',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
