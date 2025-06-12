'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CourseFilters as CourseFilterType } from '@/lib/types/course';
import { Filter } from 'lucide-react';

interface CourseFiltersProps {
  filters: CourseFilterType;
  onFilterChange: (filters: CourseFilterType) => void;
}

export function CourseFilters({ filters, onFilterChange }: CourseFiltersProps) {
  const handleChange = (key: keyof CourseFilterType, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== undefined && value !== false && key !== 'search'
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-4" align="end">
        <DropdownMenuLabel>Filter Courses</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="archived">Show Archived</Label>
            <Switch
              id="archived"
              checked={filters.isArchived || false}
              onCheckedChange={(checked) => handleChange('isArchived', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="public">Public Only</Label>
            <Switch
              id="public"
              checked={filters.isPublic === true}
              onCheckedChange={(checked) => handleChange('isPublic', checked ? true : undefined)}
            />
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onFilterChange({ isArchived: false })}
          >
            Clear Filters
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
