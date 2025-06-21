import { useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import { useRouter } from 'next/navigation';
import { moduleApi } from '@/lib/api/ModuleApiService';
import { fileApi } from '@/lib/api/FileApiService';
import type { Module, CourseFile } from '@/lib/types/course';

export function useModuleManagement(onUpdate: () => void) {
  const { toast } = useToast();
  const router = useRouter();
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleFiles, setModuleFiles] = useState<Record<string, CourseFile[]>>({});
  const [uploadingToModule, setUploadingToModule] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const toggleModule = async (moduleId: string) => {
    const newExpanded = new Set(expandedModules);

    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
      // Always reload files when expanding
      try {
        const files = await moduleApi.getModuleFiles(moduleId);
        setModuleFiles((prev) => ({ ...prev, [moduleId]: files }));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load module files.',
          variant: 'destructive',
        });
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
      setModuleFiles((prev) => ({ ...prev, [moduleId]: files }));
      setUploadingToModule(null);
      onUpdate(); // Also refresh the module list to update file counts
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reload module files.',
        variant: 'destructive',
      });
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
      setModuleFiles((prev) => ({ ...prev, [moduleId]: files }));
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

  const handlePersonalize = (file: CourseFile) => {
    // Get courseId from current URL
    const pathSegments = window.location.pathname.split('/');
    const courseIdIndex = pathSegments.indexOf('courses');

    if (courseIdIndex === -1 || courseIdIndex >= pathSegments.length - 1) {
      toast({
        title: 'Error',
        description: 'Could not extract course ID from URL.',
        variant: 'destructive',
      });
      return;
    }

    const courseId = pathSegments[courseIdIndex + 1];

    // Check if we should use the new workspace (you can change this condition)
    const useNewWorkspace = localStorage.getItem('useNewWorkspace') === 'true';

    if (useNewWorkspace) {
      // Navigate to workspace with file pre-selected
      router.push(`/courses/${courseId}/workspace?selectedFile=${file.id}`);
    } else {
      // Navigate to the explain page with file context
      router.push(
        `/courses/${courseId}/explain/${file.id}?fileName=${encodeURIComponent(file.name)}`
      );
    }
  };

  return {
    editingModule,
    setEditingModule,
    expandedModules,
    moduleFiles,
    uploadingToModule,
    setUploadingToModule,
    viewMode,
    setViewMode,
    toggleModule,
    handlePublishToggle,
    handleDelete,
    handleFileUploadSuccess,
    handleDeleteFile,
    handleDownloadFile,
    handlePersonalize,
  };
}
