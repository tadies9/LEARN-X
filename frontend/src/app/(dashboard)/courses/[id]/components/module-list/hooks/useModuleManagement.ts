import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { moduleApi } from '@/lib/api/module';
import { fileApi } from '@/lib/api/file';
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
        console.log('Loading files for module:', moduleId);
        const files = await moduleApi.getModuleFiles(moduleId);
        console.log('Files received from API:', files);
        console.log('Files type:', typeof files);
        console.log('Is array?', Array.isArray(files));
        if (files && typeof files === 'object' && !Array.isArray(files)) {
          console.log('Files object keys:', Object.keys(files));
        }
        setModuleFiles((prev) => ({ ...prev, [moduleId]: files }));
      } catch (error) {
        console.error('Error loading module files:', error);
        // Try the test endpoint as fallback
        try {
          const response = await fetch(`/api/v1/test/module/${moduleId}/files`);
          const data = await response.json();
          console.log('Test endpoint response:', data);
        } catch (e) {
          console.error('Test endpoint also failed:', e);
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
      setModuleFiles((prev) => ({ ...prev, [moduleId]: files }));
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
      console.error('Could not extract course ID from URL');
      return;
    }

    const courseId = pathSegments[courseIdIndex + 1];

    // Navigate to the learn page with file context
    router.push(
      `/courses/${courseId}/learn-v2?fileId=${file.id}&fileName=${encodeURIComponent(file.name)}`
    );
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
