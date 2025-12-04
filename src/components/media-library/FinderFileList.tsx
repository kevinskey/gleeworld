import { MediaFile } from './types';
import { cn } from '@/lib/utils';
import { Image, Video, Music, FileText, File } from 'lucide-react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { format } from 'date-fns';

interface FinderFileListProps {
  files: MediaFile[];
  selectedFiles: string[];
  onSelect: (file: MediaFile, event: React.MouseEvent) => void;
  onOpen: (file: MediaFile) => void;
  getFileType: (file: MediaFile) => string;
}

export const FinderFileList = ({
  files,
  selectedFiles,
  onSelect,
  onOpen,
  getFileType
}: FinderFileListProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return File;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'image': return 'text-green-500';
      case 'video': return 'text-purple-500';
      case 'audio': return 'text-blue-500';
      case 'document': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border sticky top-0 bg-background z-10">
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2 text-right">Size</div>
        <div className="col-span-3">Date Added</div>
      </div>

      {/* Files */}
      <div className="divide-y divide-border/50">
        {files.map((file) => {
          const fileType = getFileType(file);
          const Icon = getIcon(fileType);
          const isSelected = selectedFiles.includes(file.id);

          return (
            <ContextMenu key={file.id}>
              <ContextMenuTrigger>
                <div
                  className={cn(
                    "grid grid-cols-12 gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/10"
                  )}
                  onClick={(e) => onSelect(file, e)}
                  onDoubleClick={() => onOpen(file)}
                >
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <Icon className={cn("h-4 w-4 flex-shrink-0", getIconColor(fileType))} />
                    <span className="truncate">{file.title || 'Untitled'}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground capitalize">
                    {fileType}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {formatSize(file.file_size)}
                  </div>
                  <div className="col-span-3 text-muted-foreground">
                    {format(new Date(file.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onOpen(file)}>
                  Open
                </ContextMenuItem>
                <ContextMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                  Download
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>Rename</ContextMenuItem>
                <ContextMenuItem>Move to...</ContextMenuItem>
                <ContextMenuItem>Add to Favorites</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
};
