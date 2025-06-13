'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/navigation/theme-toggle';
import { Search, Bell, User, Settings, LogOut, HelpCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [notifications] = useState(3); // Mock notification count

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Search Bar */}
      <div className="flex items-center flex-1 max-w-xl">
        <motion.div animate={{ width: showSearch ? '100%' : 'auto' }} className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden"
          >
            <Search className="h-5 w-5" />
          </Button>
          <div className="hidden md:block relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses, resources, or ask AI..." className="pl-10 pr-4" />
          </div>
        </motion.div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* AI Quick Access */}
        <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Ask AI
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {notifications}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 p-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">New course available</p>
                <p className="text-xs text-muted-foreground">
                  "Advanced React Patterns" is now available
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Assignment due soon</p>
                <p className="text-xs text-muted-foreground">
                  "JavaScript Basics" assignment due in 2 hours
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Study streak!</p>
                <p className="text-xs text-muted-foreground">
                  You've maintained a 7-day learning streak 🔥
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="w-full">View all notifications</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>
                  {user?.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
