import { useState, useRef } from 'react';
import { MediaFile } from './types';
import { cn } from '@/lib/utils';
import { Image, Video, Music, FileText, File, Play, Pause, Presentation, FileSpreadsheet, FileCode, FileArchive, Folder, FolderInput } from 'lucide-react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from '@/components/ui/context-menu';
import { useAllMediaFolders, useMoveToFolder, MediaFolder } from '@/hooks/useMediaFolders';
import { DraggableFileItem } from './DraggableFileItem';

interface FinderFileGridProps {
  files: MediaFile[];
  selectedFiles: string[];
  onSelect: (file: MediaFile, event: React.MouseEvent) => void;
  onOpen: (file: MediaFile) => void;
  onRename: (file: MediaFile) => void;
  getFileType: (file: MediaFile) => string;
  onRefresh?: () => void;
  onDelete?: (fileIds: string[]) => void;
  onRestore?: (fileIds: string[]) => void;
  isTrashView?: boolean;
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

export const FinderFileGrid = ({
  files,
  selectedFiles,
  onSelect,
  onOpen,
  onRename,
  getFileType,
  onRefresh,
  onDelete,
  onRestore,
  isTrashView
}: FinderFileGridProps) => {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: folders = [] } = useAllMediaFolders();
  const moveToFolder = useMoveToFolder();

  // Handle bulk move - moves all selected files if file is in selection, otherwise just the single file
  const handleMoveToFolder = (fileId: string, folderId: string | null) => {
    const filesToMove = selectedFiles.includes(fileId) && selectedFiles.length > 1
      ? selectedFiles
      : [fileId];
    
    moveToFolder.mutate(
      { fileIds: filesToMove, folderId },
      { onSuccess: () => onRefresh?.() }
    );
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
      case 'image': return 'text-green-500 bg-green-500/10';
      case 'video': return 'text-purple-500 bg-purple-500/10';
      case 'audio': return 'text-blue-500 bg-blue-500/10';
      case 'pdf': return 'text-red-500 bg-red-500/10';
      case 'powerpoint': return 'text-orange-500 bg-orange-500/10';
      case 'word': return 'text-blue-600 bg-blue-600/10';
      case 'excel': return 'text-emerald-500 bg-emerald-500/10';
      case 'code': return 'text-cyan-500 bg-cyan-500/10';
      case 'archive': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };


  const handleAudioToggle = (e: React.MouseEvent, file: MediaFile) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Use raw URL - Supabase handles encoding
    const audioUrl = file.file_url;
    console.log('Audio toggle for:', file.title, 'URL:', audioUrl);
    
    if (playingAudio === file.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      
      audio.oncanplaythrough = () => {
        console.log('Audio ready to play');
        audio.play().catch(err => {
          console.error('Play failed:', err);
          setPlayingAudio(null);
          audioRef.current = null;
        });
      };
      
      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error('Audio error:', audio.error?.code, audio.error?.message, 'URL:', audioUrl);
        // Try without crossOrigin as fallback
        if (audio.crossOrigin) {
          console.log('Retrying without crossOrigin...');
          const fallbackAudio = new Audio(audioUrl);
          fallbackAudio.oncanplaythrough = () => {
            fallbackAudio.play().catch(err => {
              console.error('Fallback play failed:', err);
              setPlayingAudio(null);
            });
          };
          fallbackAudio.onended = () => {
            setPlayingAudio(null);
            audioRef.current = null;
          };
          fallbackAudio.onerror = () => {
            console.error('Fallback also failed');
            setPlayingAudio(null);
            audioRef.current = null;
          };
          audioRef.current = fallbackAudio;
          fallbackAudio.load();
          return;
        }
        setPlayingAudio(null);
        audioRef.current = null;
      };
      
      audioRef.current = audio;
      audio.src = audioUrl;
      audio.load();
      setPlayingAudio(file.id);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {files.map((file) => {
        const extendedType = getExtendedFileType(file);
        const Icon = getIcon(extendedType);
        const isSelected = selectedFiles.includes(file.id);
        const isPlaying = playingAudio === file.id;

        return (
          <DraggableFileItem key={file.id} id={file.id}>
            <ContextMenu>
              <ContextMenuTrigger>
                <div
                  className={cn(
                    "group relative flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/10 ring-2 ring-primary"
                  )}
                  onClick={(e) => onSelect(file, e)}
                  onDoubleClick={() => onOpen(file)}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {extendedType === 'image' ? (
                      <img
                        src={file.file_url}
                        alt={file.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : extendedType === 'video' ? (
                      <div className="w-full h-full relative">
                        {file.thumbnail_url ? (
                          <img
                            src={file.thumbnail_url}
                            alt={file.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center", getIconColor(extendedType))}>
                            <Icon className="h-12 w-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                    ) : extendedType === 'audio' ? (
                      <div className={cn("w-full h-full flex items-center justify-center relative", getIconColor(extendedType))}>
                        <Icon className={cn("h-12 w-12 transition-transform", isPlaying && "animate-pulse")} />
                        {/* Play/Pause button - always visible for audio */}
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/30"
                          onClick={(e) => handleAudioToggle(e, file)}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-full bg-white/90 flex items-center justify-center transition-transform",
                            "hover:scale-110 shadow-lg"
                          )}>
                            {isPlaying ? (
                              <Pause className="h-6 w-6 text-blue-600 fill-blue-600" />
                            ) : (
                              <Play className="h-6 w-6 text-blue-600 fill-blue-600 ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2", getIconColor(extendedType))}>
                        <Icon className="h-12 w-12" />
                        {extendedType !== 'other' && (
                          <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                            {extendedType}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* File name */}
                  <p className="text-xs text-center font-medium text-foreground truncate w-full px-1">
                    {file.title || 'Untitled'}
                  </p>
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
                    {selectedFiles.includes(file.id) && selectedFiles.length > 1 
                      ? `Move ${selectedFiles.length} Files` 
                      : 'Move to Folder'}
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
                {isTrashView && (
                  <ContextMenuItem
                    onClick={() => {
                      const ids = selectedFiles.includes(file.id) && selectedFiles.length > 1
                        ? selectedFiles : [file.id];
                      onRestore?.(ids);
                    }}
                  >
                    Restore
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem 
                  className="text-destructive"
                  onClick={() => {
                    const ids = selectedFiles.includes(file.id) && selectedFiles.length > 1
                      ? selectedFiles : [file.id];
                    onDelete?.(ids);
                  }}
                >
                  {isTrashView ? 'Delete Permanently' : 'Delete'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </DraggableFileItem>
        );
      })}
    </div>
  );
};
