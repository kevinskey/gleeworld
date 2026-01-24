import { MediaFile } from './types';
import { cn } from '@/lib/utils';
import { Image, Video, Music, FileText, File, Presentation, FileSpreadsheet, FileCode, FileArchive, Folder, FolderInput } from 'lucide-react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from '@/components/ui/context-menu';
import { format } from 'date-fns';
import { useAllMediaFolders, useMoveToFolder, MediaFolder } from '@/hooks/useMediaFolders';

interface FinderFileListProps {
  files: MediaFile[];
  selectedFiles: string[];
  onSelect: (file: MediaFile, event: React.MouseEvent) => void;
  onOpen: (file: MediaFile) => void;
  onRename: (file: MediaFile) => void;
  getFileType: (file: MediaFile) => string;
}

// Extended file type detection
const getExtendedFileType = (file: MediaFile): string => {
  const url = file.file_url?.toLowerCase() || '';
  const type = file.file_type?.toLowerCase() || '';
  const title = file.title?.toLowerCase() || '';
  
  if (type.includes('image') || url.match(/\.(jpg|jpeg|png|gif|webp|svg|heic|bmp|ico|tiff?)$/)) return 'image';
  if (type.includes('video') || url.match(/\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv)$/)) return 'video';
  if (type.includes('audio') || url.match(/\.(mp3|wav|m4a|aac|ogg|flac|wma)$/)) return 'audio';
  if (type.includes('pdf') || url.match(/\.pdf$/)) return 'pdf';
  if (type.includes('presentation') || type.includes('powerpoint') || url.match(/\.(ppt|pptx)$/) || title.match(/\.(ppt|pptx)$/)) return 'powerpoint';
  if (type.includes('word') || (type.includes('document') && type.includes('office')) || url.match(/\.(doc|docx)$/) || title.match(/\.(doc|docx)$/)) return 'word';
  if (type.includes('spreadsheet') || type.includes('excel') || url.match(/\.(xls|xlsx|csv)$/) || title.match(/\.(xls|xlsx)$/)) return 'excel';
  if (url.match(/\.(js|jsx|ts|tsx|json|html|css|scss|md|txt|yaml|yml|xml)$/)) return 'code';
  if (url.match(/\.(zip|rar|7z|tar|gz)$/)) return 'archive';
  return 'other';
};

export const FinderFileList = ({
  files,
  selectedFiles,
  onSelect,
  onOpen,
  onRename,
  getFileType
}: FinderFileListProps) => {
  const { data: folders = [] } = useAllMediaFolders();
  const moveToFolder = useMoveToFolder();

  const handleMoveToFolder = (fileId: string, folderId: string | null) => {
    moveToFolder.mutate({ fileIds: [fileId], folderId });
  };
  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'pdf': return FileText;
      case 'powerpoint': return Presentation;
      case 'word': return FileText;
      case 'excel': return FileSpreadsheet;
      case 'code': return FileCode;
      case 'archive': return FileArchive;
      default: return File;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'image': return 'text-green-500';
      case 'video': return 'text-purple-500';
      case 'audio': return 'text-blue-500';
      case 'pdf': return 'text-red-500';
      case 'powerpoint': return 'text-orange-500';
      case 'word': return 'text-blue-600';
      case 'excel': return 'text-emerald-500';
      case 'code': return 'text-cyan-500';
      case 'archive': return 'text-yellow-500';
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
          const extendedType = getExtendedFileType(file);
          const Icon = getIcon(extendedType);
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
                    <Icon className={cn("h-4 w-4 flex-shrink-0", getIconColor(extendedType))} />
                    <span className="truncate">{file.title || 'Untitled'}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground capitalize">
                    {extendedType}
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
                <ContextMenuItem onClick={() => onRename(file)}>Rename</ContextMenuItem>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to Folder
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {file.folder_id && (
                      <ContextMenuItem onClick={() => handleMoveToFolder(file.id, null)}>
                        <Folder className="h-4 w-4 mr-2" />
                        Remove from Folder
                      </ContextMenuItem>
                    )}
                    {file.folder_id && folders.length > 0 && <ContextMenuSeparator />}
                    {folders.length === 0 ? (
                      <ContextMenuItem disabled>No folders available</ContextMenuItem>
                    ) : (
                      folders.map((folder: MediaFolder) => (
                        <ContextMenuItem 
                          key={folder.id} 
                          onClick={() => handleMoveToFolder(file.id, folder.id)}
                          disabled={folder.id === file.folder_id}
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          {folder.name}
                        </ContextMenuItem>
                      ))
                    )}
                  </ContextMenuSubContent>
                </ContextMenuSub>
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
