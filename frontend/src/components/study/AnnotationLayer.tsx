'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { useAnnotations } from '@/hooks/useAnnotations';
import { Highlighter, MessageSquare, Edit, Trash2, Plus, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Annotation {
  id: string;
  fileId: string;
  text: string;
  note?: string;
  color: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: Date;
}

interface AnnotationLayerProps {
  fileId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFFF00', className: 'bg-yellow-300' },
  { name: 'Green', value: '#90EE90', className: 'bg-green-300' },
  { name: 'Blue', value: '#87CEEB', className: 'bg-blue-300' },
  { name: 'Pink', value: '#FFB6C1', className: 'bg-pink-300' },
  { name: 'Orange', value: '#FFA500', className: 'bg-orange-300' },
  { name: 'Purple', value: '#DDA0DD', className: 'bg-purple-300' },
];

export function AnnotationLayer({
  fileId,
  containerRef,
  onAnnotationCreate,
}: AnnotationLayerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [selection, setSelection] = useState<{
    text: string;
    range: Range;
    rect: DOMRect;
  } | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    annotation?: Annotation;
    note: string;
  }>({ open: false, note: '' });

  const {
    annotations: savedAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    loading,
  } = useAnnotations(fileId);

  // Load saved annotations
  useEffect(() => {
    if (savedAnnotations) {
      setAnnotations(savedAnnotations);
    }
  }, [savedAnnotations]);

  // Handle text selection
  const handleSelection = useCallback(() => {
    if (!isHighlightMode) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (text.length === 0) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    // Calculate relative position
    const relativeRect = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    };

    setSelection({
      text,
      range,
      rect: new DOMRect(relativeRect.x, relativeRect.y, relativeRect.width, relativeRect.height),
    });
  }, [isHighlightMode, containerRef]);

  // Set up selection listener
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelection, 10); // Small delay to ensure selection is complete
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleSelection]);

  // Create highlight annotation
  const createHighlight = async (note?: string) => {
    if (!selection) return;

    const annotation: Omit<Annotation, 'id' | 'createdAt'> = {
      fileId,
      text: selection.text,
      note,
      color: selectedColor.value,
      position: {
        page: 1, // TODO: Calculate actual page number
        x: selection.rect.x,
        y: selection.rect.y,
        width: selection.rect.width,
        height: selection.rect.height,
      },
    };

    try {
      const newAnnotation = await createAnnotation(annotation);
      if (newAnnotation) {
        setAnnotations((prev) => [...prev, newAnnotation]);
        onAnnotationCreate?.(annotation);
      }
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }

    // Clear selection
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Update annotation note
  const updateNote = async (annotationId: string, note: string) => {
    try {
      await updateAnnotation(annotationId, { note });
      setAnnotations((prev) =>
        prev.map((ann) => (ann.id === annotationId ? { ...ann, note } : ann))
      );
      setNoteDialog({ open: false, note: '' });
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId);
      setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId));
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="flex items-center gap-2 p-3">
          <Button
            variant={isHighlightMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsHighlightMode(!isHighlightMode)}
          >
            <Highlighter className="mr-2 h-4 w-4" />
            Highlight
          </Button>

          {/* Color picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Palette className="mr-2 h-4 w-4" />
                <div
                  className="h-3 w-3 rounded-full border"
                  style={{ backgroundColor: selectedColor.value }}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {HIGHLIGHT_COLORS.map((color) => (
                <DropdownMenuItem
                  key={color.value}
                  onClick={() => setSelectedColor(color)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="h-4 w-4 rounded border"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant="secondary" className="ml-auto">
            {annotations.length} annotations
          </Badge>
        </CardContent>
      </Card>

      {/* Selection popup */}
      {selection && (
        <div
          className="absolute z-50 rounded-lg border bg-white p-2 shadow-lg"
          style={{
            left: selection.rect.x,
            top: selection.rect.y + selection.rect.height + 5,
          }}
        >
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createHighlight()}>
              Highlight
            </Button>
            <Dialog
              open={noteDialog.open}
              onOpenChange={(open) => setNoteDialog({ open, note: '' })}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteDialog({ open: true, note: '' })}
                >
                  <MessageSquare className="mr-1 h-3 w-3" />
                  Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded bg-muted p-3 text-sm">"{selection.text}"</div>
                  <Input
                    placeholder="Add your note..."
                    value={noteDialog.note}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNoteDialog((prev) => ({ ...prev, note: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => createHighlight(noteDialog.note)}
                      disabled={!noteDialog.note.trim()}
                    >
                      Save Note
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setNoteDialog({ open: false, note: '' })}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Annotation overlays */}
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="absolute border-2 border-opacity-50 cursor-pointer"
          style={{
            left: annotation.position.x,
            top: annotation.position.y,
            width: annotation.position.width,
            height: annotation.position.height,
            backgroundColor: annotation.color + '40', // Add transparency
            borderColor: annotation.color,
          }}
          onClick={() => {
            if (annotation.note) {
              setNoteDialog({
                open: true,
                annotation,
                note: annotation.note,
              });
            }
          }}
          title={annotation.note || annotation.text}
        >
          {annotation.note && (
            <MessageSquare className="absolute -top-2 -right-2 h-4 w-4 text-blue-600" />
          )}
        </div>
      ))}

      {/* Annotations list */}
      {annotations.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Annotations</h3>
            <div className="space-y-2">
              {annotations.map((annotation) => (
                <div key={annotation.id} className="flex items-start gap-2 p-2 rounded border">
                  <div
                    className="h-4 w-4 rounded border flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: annotation.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">"{annotation.text}"</p>
                    {annotation.note && (
                      <p className="text-xs text-muted-foreground mt-1">{annotation.note}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() =>
                        setNoteDialog({
                          open: true,
                          annotation,
                          note: annotation.note || '',
                        })
                      }
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleDeleteAnnotation(annotation.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit note dialog */}
      <Dialog
        open={noteDialog.open && !!noteDialog.annotation}
        onOpenChange={(open) => !open && setNoteDialog({ open: false, note: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          {noteDialog.annotation && (
            <div className="space-y-4">
              <div className="rounded bg-muted p-3 text-sm">"{noteDialog.annotation.text}"</div>
              <Input
                placeholder="Edit your note..."
                value={noteDialog.note}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNoteDialog((prev) => ({ ...prev, note: e.target.value }))
                }
              />
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    noteDialog.annotation && updateNote(noteDialog.annotation.id, noteDialog.note)
                  }
                >
                  Save
                </Button>
                <Button variant="outline" onClick={() => setNoteDialog({ open: false, note: '' })}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
