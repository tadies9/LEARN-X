import type { Module, CourseFile } from '@/lib/types/course';

export interface CollapsibleModuleListProps {
  modules?: Module[];
  onUpdate: () => void;
  onReorder: (moduleId: string, newPosition: number) => void;
}

export interface ModuleContentItem {
  id: string;
  type: 'file' | 'assignment' | 'page' | 'external_url' | 'video';
  title: string;
  description?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
  isPublished: boolean;
}

export interface ModuleCardProps {
  module: Module;
  index: number;
  isExpanded: boolean;
  files: CourseFile[];
  viewMode: 'list' | 'grid';
  dragOverIndex: number | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onPublishToggle: () => void;
  onDelete: () => void;
  onUploadFile: () => void;
  onDeleteFile: (fileId: string) => void;
  onDownloadFile: (fileId: string) => void;
  onPersonalizeFile: (file: CourseFile) => void;
  onDragStart: (e: React.DragEvent, module: Module) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onViewModeChange: (mode: 'list' | 'grid') => void;
}
