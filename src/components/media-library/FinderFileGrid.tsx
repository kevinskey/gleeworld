import { useState, useRef } from 'react';
import { MediaFile } from './types';
import { cn } from '@/lib/utils';
import { Image, Video, Music, FileText, File, Play, Pause } from 'lucide-react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';

interface FinderFileGridProps {
  files: MediaFile[];
  selectedFiles: string[];
  onSelect: (file: MediaFile, event: React.MouseEvent) => void;
  onOpen: (file: MediaFile) => void;
  getFileType: (file: MediaFile) => string;
}

export const FinderFileGrid = ({
  files,
  selectedFiles,
  onSelect,
  onOpen,
  getFileType
}: FinderFileGridProps) => {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [hoveredAudio, setHoveredAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      case 'image': return 'text-green-500 bg-green-500/10';
      case 'video': return 'text-purple-500 bg-purple-500/10';
      case 'audio': return 'text-blue-500 bg-blue-500/10';
      case 'document': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const handleAudioToggle = (e: React.MouseEvent, file: MediaFile) => {
    e.stopPropagation();
    
    if (playingAudio === file.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(file.file_url);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      audioRef.current = audio;
      setPlayingAudio(file.id);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {files.map((file) => {
        const fileType = getFileType(file);
        const Icon = getIcon(fileType);
        const isSelected = selectedFiles.includes(file.id);
        const isPlaying = playingAudio === file.id;
        const isHovered = hoveredAudio === file.id;

        return (
          <ContextMenu key={file.id}>
            <ContextMenuTrigger>
              <div
                className={cn(
                  "group relative flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all",
                  "hover:bg-muted/50",
                  isSelected && "bg-primary/10 ring-2 ring-primary"
                )}
                onClick={(e) => onSelect(file, e)}
                onDoubleClick={() => onOpen(file)}
                onMouseEnter={() => fileType === 'audio' && setHoveredAudio(file.id)}
                onMouseLeave={() => setHoveredAudio(null)}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                  {fileType === 'image' ? (
                    <img
                      src={file.file_url}
                      alt={file.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : fileType === 'video' ? (
                    <div className="w-full h-full relative">
                      {file.thumbnail_url ? (
                        <img
                          src={file.thumbnail_url}
                          alt={file.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center", getIconColor(fileType))}>
                          <Icon className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-8 w-8 text-white fill-white" />
                      </div>
                    </div>
                  ) : fileType === 'audio' ? (
                    <div className={cn("w-full h-full flex items-center justify-center relative", getIconColor(fileType))}>
                      <Icon className={cn("h-12 w-12 transition-transform", isPlaying && "animate-pulse")} />
                      {/* Play/Pause overlay on hover */}
                      <div 
                        className={cn(
                          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
                          (isHovered || isPlaying) ? "opacity-100" : "opacity-0"
                        )}
                        onClick={(e) => handleAudioToggle(e, file)}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform">
                          {isPlaying ? (
                            <Pause className="h-6 w-6 text-blue-600 fill-blue-600" />
                          ) : (
                            <Play className="h-6 w-6 text-blue-600 fill-blue-600 ml-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={cn("w-full h-full flex items-center justify-center", getIconColor(fileType))}>
                      <Icon className="h-12 w-12" />
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
  );
};
