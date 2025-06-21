'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { motion } from 'framer-motion';
import { Clock, Users, PlayCircle, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CourseProgressCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    progress: number;
    totalModules: number;
    completedModules: number;
    duration: string;
    students: number;
    nextLesson?: string;
  };
}

export function CourseProgressCard({ course }: CourseProgressCardProps) {
  const router = useRouter();

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => router.push(`/courses/${course.id}/workspace`)}
      >
        {/* Thumbnail */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-20">📚</div>
            </div>
          )}

          {/* Progress Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-medium">
                {course.completedModules} of {course.totalModules} modules
              </span>
              <span className="text-sm font-bold">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="mt-2 bg-white/20" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <Link href={`/courses/${course.id}/workspace`} className="hover:underline flex-1">
              <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}/workspace`)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>Download Resources</DropdownMenuItem>
                <DropdownMenuItem>Share Progress</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{course.students}</span>
            </div>
          </div>

          {/* Action */}
          {course.nextLesson && (
            <Button
              className="w-full"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/courses/${course.id}/workspace`);
              }}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Continue: {course.nextLesson}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
