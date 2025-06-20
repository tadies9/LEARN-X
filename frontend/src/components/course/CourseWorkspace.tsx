'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  FileImage,
  Video,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Scissors,
  MoreHorizontal,
  BookOpen,
  Loader2,
  Plus,
  Upload,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { StudyDrawer } from './StudyDrawer';
import { BulkActionBar } from './BulkActionBar';
import { FileUploadDialog } from './FileUploadDialog';
import { FileDeleteDialog } from './FileDeleteDialog';
import { AddModuleDialog } from './AddModuleDialog';
import { EditModuleDialog } from './EditModuleDialog';
import { ModuleMenu } from './ModuleMenu';
import type { Module, CourseFile } from '@/lib/types/course';
import { fileApi } from '@/lib/api/file';
import { usePersona } from '@/hooks/usePersona';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CourseWorkspaceProps {
  courseId: string;
  modules: Module[];
  selectedFileId?: string | null;
  onFileAction?: (fileId: string, action: string) => void;
  onModulesChanged?: () => void;
}

export function CourseWorkspace({
  courseId,
  modules,
  selectedFileId,
  onFileAction,
  onModulesChanged,
}: CourseWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { persona } = usePersona();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Map<string, any>>(new Map());
  const [completedContent, setCompletedContent] = useState<Map<string, any>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // File management state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [fileToDelete, setFileToDelete] = useState<CourseFile | null>(null);

  // Handle pre-selected file from navigation
  useEffect(() => {
    if (selectedFileId) {
      // Auto-open drawer with flashcards for selected file
      modules.forEach((module) => {
        const file = module.files?.find((f) => f.id === selectedFileId);
        if (file) {
          setTimeout(() => {
            handleFileAction(file, 'flashcards');
          }, 500);
        }
      });
    }
  }, [selectedFileId, modules]);

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Toggle module collapse (modules are expanded by default)
  const toggleModule = (moduleId: string) => {
    const newCollapsed = new Set(collapsedModules);
    if (newCollapsed.has(moduleId)) {
      newCollapsed.delete(moduleId);
    } else {
      newCollapsed.add(moduleId);
    }
    setCollapsedModules(newCollapsed);
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Handle file upload
  const handleUploadClick = (module: Module) => {
    setSelectedModule(module);
    setUploadDialogOpen(true);
  };

  // Handle file delete
  const handleDeleteFile = (file: CourseFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  // Refresh modules after file operations
  const handleFileOperationComplete = () => {
    // Call the parent callback to refresh modules
    if (onModulesChanged) {
      onModulesChanged();
    }
  };

  // Handle explain file - full takeover navigation
  const handleExplainFile = (file: CourseFile & { moduleTitle: string }) => {
    // Navigate to the explain page with file context
    router.push(
      `/courses/${courseId}/explain/${file.id}?fileName=${encodeURIComponent(file.name)}`
    );
  };

  // Handle single file action
  const handleFileAction = async (file: CourseFile, action: string) => {
    setDrawerOpen(true);
    setIsGenerating(true);

    // Create a job ID
    const jobId = `${file.id}-${action}-${Date.now()}`;

    // Add to active jobs
    setActiveJobs((prev) =>
      new Map(prev).set(jobId, {
        fileId: file.id,
        fileName: file.name,
        action,
        status: 'generating',
        startedAt: new Date(),
      })
    );

    try {
      // Call the API to generate content
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_ids: [file.id],
          output_types: [action],
          course_id: courseId,
          persona_id: persona?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate content');

      const result = await response.json();

      // Simulate real-time updates (in production, use Supabase Realtime)
      setTimeout(() => {
        setActiveJobs((prev) => {
          const updated = new Map(prev);
          updated.delete(jobId);
          return updated;
        });

        setCompletedContent((prev) =>
          new Map(prev).set(jobId, {
            fileId: file.id,
            fileName: file.name,
            action,
            content: result.data,
            completedAt: new Date(),
          })
        );

        setIsGenerating(false);
      }, 3000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate content. Please try again.',
        variant: 'destructive',
      });

      setActiveJobs((prev) => {
        const updated = new Map(prev);
        updated.delete(jobId);
        return updated;
      });

      setIsGenerating(false);
    }
  };

  // Handle bulk generation
  const handleBulkGenerate = async () => {
    if (selectedFiles.size === 0) return;

    setDrawerOpen(true);
    setIsGenerating(true);

    const jobId = `bulk-${Date.now()}`;

    setActiveJobs((prev) =>
      new Map(prev).set(jobId, {
        fileIds: Array.from(selectedFiles),
        action: 'bulk',
        status: 'generating',
        startedAt: new Date(),
      })
    );

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_ids: Array.from(selectedFiles),
          output_types: ['flashcards', 'summary'],
          course_id: courseId,
          persona_id: persona?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate study pack');

      const result = await response.json();

      setTimeout(() => {
        setActiveJobs((prev) => {
          const updated = new Map(prev);
          updated.delete(jobId);
          return updated;
        });

        setCompletedContent((prev) =>
          new Map(prev).set(jobId, {
            fileIds: Array.from(selectedFiles),
            action: 'bulk',
            content: result.data,
            completedAt: new Date(),
          })
        );

        setIsGenerating(false);
        setSelectedFiles(new Set());
      }, 5000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate study pack. Please try again.',
        variant: 'destructive',
      });

      setActiveJobs((prev) => {
        const updated = new Map(prev);
        updated.delete(jobId);
        return updated;
      });

      setIsGenerating(false);
    }
  };

  // Get all files from all modules for main content area
  const allFiles = modules.flatMap((module) => {
    console.log(
      `Module ${module.id} (${module.title}) has ${module.files?.length || 0} files:`,
      module.files
    );
    return (module.files || []).map((file) => ({
      ...file,
      moduleTitle: module.title,
      moduleId: module.id,
    }));
  });

  console.log('CourseWorkspace - Modules:', modules.length, 'Files:', allFiles.length);
  console.log('All files details:', allFiles);

  return (
    <div className="flex h-full">
      {/* Left Rail - Module Navigation */}
      <div className="w-72 border-r bg-gradient-to-b from-muted/20 to-background">
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-sm text-muted-foreground tracking-wider">
                COURSE MODULES
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModuleOpen(true)}
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {modules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No modules yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddModuleOpen(true)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create your first module
                  </Button>
                </div>
              ) : (
                modules.map((module, index) => (
                  <div key={module.id} className="space-y-1">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">
                            {module.title}
                          </span>
                          {module.files && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {module.files.length} {module.files.length === 1 ? 'file' : 'files'}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            collapsedModules.has(module.id) ? '-rotate-90' : ''
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUploadClick(module);
                                }}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Upload file to this module</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <ModuleMenu
                          module={module}
                          moduleIndex={index}
                          totalModules={modules.length}
                          onEdit={setEditingModule}
                          onDeleted={() => onModulesChanged?.()}
                          onReordered={() => onModulesChanged?.()}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area - All Files */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-background to-muted/5">
        <ScrollArea className="h-full">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">All Course Files</h2>
              <p className="text-muted-foreground">
                Click explain to understand concepts, or use study tools to prepare for exams
              </p>
            </div>

            {allFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border-2 border-dashed">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No files uploaded yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  {modules.length === 0
                    ? 'Start by creating a module, then upload files to begin learning.'
                    : 'Upload files to your modules to start learning with AI-powered explanations and study tools.'}
                </p>
                {modules.length === 0 ? (
                  <Button variant="outline" onClick={() => setAddModuleOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Module
                  </Button>
                ) : (
                  <Button onClick={() => handleUploadClick(modules[0])} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload First File
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {allFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-5 bg-card rounded-xl border hover:shadow-md hover:border-primary/20 transition-all group"
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                    />

                    {/* File Icon */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/5 text-primary">
                      {getFileIcon(file.mimeType)}
                    </div>

                    {/* File Name and Module */}
                    <div className="flex-1">
                      <p className="font-medium text-base">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {file.moduleTitle}
                        </Badge>
                        {file.size && (
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions (Show on Hover) */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleExplainFile(file)}
                        className="h-8 text-sm mr-2"
                      >
                        📖 Explain
                      </Button>
                      <div className="h-px w-4 bg-border" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileAction(file, 'flashcards')}
                        className="h-7 text-xs"
                      >
                        ⚡ Flashcards
                      </Button>
                      <div className="text-muted-foreground">|</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileAction(file, 'summary')}
                        className="h-7 text-xs"
                      >
                        ✂️ Summary
                      </Button>
                      <div className="text-muted-foreground">|</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const url = await fileApi.getSignedUrl(file.id);
                                window.open(url, '_blank');
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to get download link',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteFile(file)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete File
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Study Drawer */}
      <StudyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeJobs={activeJobs}
        completedContent={completedContent}
        isGenerating={isGenerating}
      />

      {/* Bulk Action Bar */}
      {selectedFiles.size > 0 && (
        <BulkActionBar
          selectedCount={selectedFiles.size}
          onGenerateStudyPack={handleBulkGenerate}
          onClearSelection={() => setSelectedFiles(new Set())}
        />
      )}

      {/* Add Module Dialog */}
      <AddModuleDialog
        courseId={courseId}
        open={addModuleOpen}
        onOpenChange={setAddModuleOpen}
        onModuleAdded={() => onModulesChanged?.()}
      />

      {/* Edit Module Dialog */}
      <EditModuleDialog
        module={editingModule}
        open={!!editingModule}
        onOpenChange={(open: boolean) => !open && setEditingModule(null)}
        onModuleUpdated={() => {
          setEditingModule(null);
          onModulesChanged?.();
        }}
      />

      {/* File Upload Dialog */}
      {selectedModule && (
        <FileUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          moduleId={selectedModule.id}
          moduleTitle={selectedModule.title}
          onUploadComplete={handleFileOperationComplete}
        />
      )}

      {/* File Delete Dialog */}
      <FileDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        file={fileToDelete}
        onDeleteComplete={handleFileOperationComplete}
      />
    </div>
  );
}
