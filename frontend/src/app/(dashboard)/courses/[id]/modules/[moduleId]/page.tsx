'use client';

import { useState } from 'react';

import { useModuleDetail } from '@/hooks/useModuleDetail';
import { ModuleBreadcrumb } from '@/components/modules/ModuleBreadcrumb';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { LoadingSkeleton } from '@/components/modules/LoadingSkeleton';
import { FilesSection } from '@/components/modules/FilesSection';

import { FileUploadDialog } from './components/FileUploadDialog';

export default function ModuleDetailPage({ params }: { params: { id: string; moduleId: string } }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const {
    course,
    module,
    files,
    loading,
    loadData,
    handleFileReorder,
  } = useModuleDetail({
    courseId: params.id,
    moduleId: params.moduleId,
  });

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!course || !module) return null;

  return (
    <div className="container mx-auto py-8">
      <ModuleBreadcrumb courseId={params.id} courseTitle={course.title} />
      <ModuleHeader module={module} onUpload={() => setUploadDialogOpen(true)} />
      <FilesSection
        files={files}
        onUpdate={loadData}
        onUpload={() => setUploadDialogOpen(true)}
        onReorder={handleFileReorder}
      />
      <FileUploadDialog
        moduleId={params.moduleId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
