'use client';

import { EditModuleDialog } from './EditModuleDialog';
import { UploadFileDialog } from './UploadFileDialog';
import { ModuleCard } from './module-list/ModuleCard';
import { useModuleManagement } from './module-list/hooks/useModuleManagement';
import { useDragAndDrop } from './module-list/hooks/useDragAndDrop';
import type { CollapsibleModuleListProps } from './module-list/types';

export function CollapsibleModuleList({
  modules = [],
  onUpdate,
  onReorder,
}: CollapsibleModuleListProps) {
  const {
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
  } = useModuleManagement(onUpdate);

  const { dragOverIndex, handleDragStart, handleDragOver, handleDragLeave, handleDrop } =
    useDragAndDrop(modules, onReorder);

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No modules yet. Create your first module to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {modules.map((module, index) => (
        <ModuleCard
          key={module.id}
          module={module}
          index={index}
          isExpanded={expandedModules.has(module.id)}
          files={moduleFiles[module.id] || []}
          viewMode={viewMode}
          dragOverIndex={dragOverIndex}
          onToggleExpand={() => toggleModule(module.id)}
          onEdit={() => setEditingModule(module)}
          onPublishToggle={() => handlePublishToggle(module)}
          onDelete={() => handleDelete(module)}
          onUploadFile={() => setUploadingToModule(module.id)}
          onDeleteFile={(fileId) => handleDeleteFile(fileId, module.id)}
          onDownloadFile={handleDownloadFile}
          onPersonalizeFile={handlePersonalize}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onViewModeChange={setViewMode}
        />
      ))}

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
