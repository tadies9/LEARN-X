'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { useToast } from '@/components/ui/use-toast';
import { moduleApi } from '@/lib/api/module';
import { fileApi } from '@/lib/api/file';
import type { Module, CourseFile } from '@/lib/types/course';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  MoreVertical,
  Plus,
  Trash,
  Upload,
  Link as LinkIcon,
  Video,
  FileImage,
  Download,
} from 'lucide-react';
import { EditModuleDialog } from './EditModuleDialog';
import { UploadFileDialog } from './UploadFileDialog';
import Link from 'next/link';

interface CollapsibleModuleListProps {
  modules?: Module[];
  onUpdate: () => void;
  onReorder: (moduleId: string, newPosition: number) => void;
}

interface ModuleContentItem {
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

export function CollapsibleModuleList({ modules = [], onUpdate, onReorder }: CollapsibleModuleListProps) {
  const { toast } = useToast();
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleFiles, setModuleFiles] = useState<Record<string, CourseFile[]>>({});
  const [uploadingToModule, setUploadingToModule] = useState<string | null>(null);
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggleModule = async (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
      // Load module files if not already loaded
      if (!moduleFiles[moduleId]) {
        try {
          const files = await moduleApi.getModuleFiles(moduleId);
          setModuleFiles(prev => ({ ...prev, [moduleId]: files }));
        } catch (error) {
          console.error('Error loading module files:', error);
        }
      }
    }
    
    setExpandedModules(newExpanded);
  };

  const handlePublishToggle = async (module: Module) => {
    try {
      if (module.isPublished) {
        await moduleApi.unpublishModule(module.id);
        toast({
          title: 'Module unpublished',
          description: 'The module is now hidden from students.',
        });
      } else {
        await moduleApi.publishModule(module.id);
        toast({
          title: 'Module published',
          description: 'The module is now visible to students.',
        });
      }
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${module.isPublished ? 'unpublish' : 'publish'} module.`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (module: Module) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return;
    }

    try {
      await moduleApi.deleteModule(module.id);
      toast({
        title: 'Module deleted',
        description: 'The module has been permanently deleted.',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete module.',
        variant: 'destructive',
      });
    }
  };

  const handleFileUploadSuccess = async (moduleId: string) => {
    // Reload module files
    try {
      const files = await moduleApi.getModuleFiles(moduleId);
      setModuleFiles(prev => ({ ...prev, [moduleId]: files }));
      setUploadingToModule(null);
      onUpdate(); // Also refresh the module list to update file counts
    } catch (error) {
      console.error('Error reloading module files:', error);
    }
  };

  const handleDeleteFile = async (fileId: string, moduleId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await fileApi.deleteFile(fileId);
      toast({
        title: 'File deleted',
        description: 'The file has been permanently deleted.',
      });
      // Reload module files
      const files = await moduleApi.getModuleFiles(moduleId);
      setModuleFiles(prev => ({ ...prev, [moduleId]: files }));
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const url = await fileApi.getSignedUrl(fileId);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file.',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const handleDragStart = (e: React.DragEvent, module: Module) => {
    setDraggedModule(module);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedModule) return;

    const draggedIndex = modules.findIndex((m) => m.id === draggedModule.id);
    if (draggedIndex === dropIndex) return;

    await onReorder(draggedModule.id, dropIndex);
    setDraggedModule(null);
  };

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No modules yet. Create your first module to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {modules.map((module, index) => {
        const isExpanded = expandedModules.has(module.id);
        const files = moduleFiles[module.id] || [];

        return (
          <Card
            key={module.id}
            className={`transition-all ${dragOverIndex === index ? 'border-primary shadow-lg' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, module)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {/* Drag Handle */}
                <div className="cursor-move text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleModule(module.id)}
                  className="p-1 h-6 w-6"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                {/* Module Title and Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{module.title}</h3>
                    {!module.isPublished && (
                      <Badge variant="secondary" className="text-xs">
                        Draft
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{module.fileCount || 0} files</span>
                    </div>
                    {module.estimatedDuration && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{module.estimatedDuration} min</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Module Actions */}
                <div className="flex items-center gap-2">
                  {/* Add Content Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setUploadingToModule(module.id)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        <FileText className="mr-2 h-4 w-4" />
                        Create Page
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        External URL
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        <Video className="mr-2 h-4 w-4" />
                        Video
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Module Settings */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingModule(module)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePublishToggle(module)}>
                        {module.isPublished ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(module)} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {module.description && (
                <p className="text-sm text-muted-foreground mt-2 ml-11">{module.description}</p>
              )}
            </CardHeader>

            {/* Expandable Content */}
            {isExpanded && (
              <CardContent className="pt-0 ml-11">
                <div className="space-y-2">
                  {files.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No files in this module yet.</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadingToModule(module.id)}
                        className="mt-2"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload first file
                      </Button>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                      >
                        <div className="text-muted-foreground">
                          {getFileIcon(file.mimeType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.status}
                            </Badge>
                          </div>
                          {file.description && (
                            <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>
                              {file.createdAt ? 
                                new Date(file.createdAt).toLocaleDateString() : 
                                'Recently uploaded'
                              }
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadFile(file.id)}
                            className="h-8 w-8"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFile(file.id, module.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Edit Module Dialog */}
      {editingModule && (
        <EditModuleDialog
          module={editingModule}
          open={true}
          onOpenChange={(open) => !open && setEditingModule(null)}
          onSuccess={() => {
            setEditingModule(null);
            onUpdate();
          }}
        />
      )}

      {/* Upload File Dialog */}
      {uploadingToModule && (
        <UploadFileDialog
          moduleId={uploadingToModule}
          open={true}
          onOpenChange={(open) => !open && setUploadingToModule(null)}
          onSuccess={() => handleFileUploadSuccess(uploadingToModule)}
        />
      )}
    </div>
  );
}