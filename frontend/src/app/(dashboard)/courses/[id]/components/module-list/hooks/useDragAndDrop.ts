import { useState } from 'react';
import type { Module } from '@/lib/types/course';

export function useDragAndDrop(
  modules: Module[],
  onReorder: (moduleId: string, newPosition: number) => void
) {
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  return {
    draggedModule,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
