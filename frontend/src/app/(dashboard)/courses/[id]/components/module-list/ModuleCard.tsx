'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup';
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
  Sparkles,
  Grid,
  List,
} from 'lucide-react';
import type { ModuleCardProps } from './types';

export function ModuleCard({
  module,
  index,
  isExpanded,
  files,
  viewMode,
  dragOverIndex,
  onToggleExpand,
  onEdit,
  onPublishToggle,
  onDelete,
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  onPersonalizeFile,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onViewModeChange,
}: ModuleCardProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const renderFileList = () => {
    if (!files || files.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground col-span-full">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No files in this module yet.</p>
          <Button variant="ghost" size="sm" onClick={onUploadFile} className="mt-2">
            <Upload className="h-4 w-4 mr-1" />
            Upload first file
          </Button>
        </div>
      );
    }

    return files.map((file) => {
      if (viewMode === 'grid') {
        return (
          <Card key={file.id} className="group hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 text-muted-foreground">
                  {getFileIcon(file.mimeType)}
                </div>

                <div className="w-full space-y-2">
                  <h4 className="font-medium text-sm truncate">{file.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {file.status}
                  </Badge>
                </div>

                {file.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{file.description}</p>
                )}

                <div className="text-xs text-muted-foreground">
                  <div>{formatFileSize(file.size)}</div>
                  <div>
                    {file.createdAt
                      ? new Date(file.createdAt).toLocaleDateString()
                      : 'Recently uploaded'}
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPersonalizeFile(file)}
                    className="h-8 w-8 border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                    title="Personalized Learning"
                  >
                    <Sparkles className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownloadFile(file.id)}
                    className="h-8 w-8"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteFile(file.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      // List view
      return (
        <div
          key={file.id}
          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
        >
          <div className="text-muted-foreground">{getFileIcon(file.mimeType)}</div>

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
                {file.createdAt
                  ? new Date(file.createdAt).toLocaleDateString()
                  : 'Recently uploaded'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPersonalizeFile(file)}
              className="h-8 w-8 border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
              title="Personalized Learning"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownloadFile(file.id)}
              className="h-8 w-8"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteFile(file.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    });
  };

  return (
    <Card
      className={`transition-all ${dragOverIndex === index ? 'border-primary shadow-lg' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, module)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div className="cursor-move text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Expand/Collapse Button */}
          <Button variant="ghost" size="sm" onClick={onToggleExpand} className="p-1 h-6 w-6">
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
                <DropdownMenuItem onClick={onUploadFile}>
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
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPublishToggle}>
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
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
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
          {/* View Mode Toggle */}
          {files.length > 0 && (
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </div>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && onViewModeChange(value as 'list' | 'grid')}
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
                : 'space-y-2'
            }
          >
            {renderFileList()}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
