import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { X, Minimize2, Maximize2, GripHorizontal, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYouTubeThumbnail } from '@/utils/youtubeUtils';

interface FloatingYouTubePlayerProps {
  videoId: string;
  onClose: () => void;
  title?: string;
}

const FloatingYouTubePlayer: React.FC<FloatingYouTubePlayerProps> = ({
  videoId,
  onClose,
  title = 'YouTube Player'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [size, setSize] = useState({ width: 400, height: 280 });
  const [position, setPosition] = useState({ 
    x: Math.max(20, window.innerWidth - 420), 
    y: Math.max(20, window.innerHeight - 340) 
  });

  const thumbnailUrl = getYouTubeThumbnail(videoId, 'high');

  const content = (
    <Rnd
      data-floating-youtube-player="true"
      position={position}
      size={{ width: size.width, height: isMinimized ? 48 : size.height }}
      minWidth={280}
      minHeight={isMinimized ? 48 : 200}
      maxWidth={800}
      maxHeight={600}
      bounds="window"
      dragHandleClassName="yt-drag-handle"
      onDragStop={(e, d) => {
        setPosition({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, pos) => {
        if (!isMinimized) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(pos);
        }
      }}
      enableResizing={!isMinimized}
      style={{ zIndex: 999999 }}
    >
      <div 
        data-floating-youtube-player="true"
        className={cn(
          "flex flex-col bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden",
          "h-full w-full"
        )}
      >
        {/* Header - Drag Handle */}
        <div className="yt-drag-handle flex items-center justify-between px-3 py-2 bg-primary cursor-move select-none">
          <div className="flex items-center gap-2 text-primary-foreground">
            <GripHorizontal className="h-4 w-4 opacity-60" />
            <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
          </div>
          <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 rounded"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsMinimized(prev => !prev);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-primary-foreground hover:bg-destructive hover:text-destructive-foreground rounded"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* YouTube Content */}
        {!isMinimized && (
          <div className="flex-1 bg-black relative min-h-[180px]">
            {!isPlaying ? (
              // Thumbnail with play button
              <div 
                className="w-full h-full relative cursor-pointer group flex items-center justify-center"
                onClick={() => setIsPlaying(true)}
              >
                {/* Background placeholder while image loads */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                
                <img 
                  src={thumbnailUrl} 
                  alt={title}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                    thumbnailLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setThumbnailLoaded(true)}
                  onError={() => setThumbnailLoaded(false)}
                />
                
                {/* Play button overlay - always visible */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors z-10">
                  <div className="w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-700 transition-colors shadow-lg">
                    <Play className="h-7 w-7 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              // YouTube iframe
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="w-full h-full"
                style={{ border: 'none' }}
              />
            )}
          </div>
        )}
      </div>
    </Rnd>
  );

  // Render via portal to isolate from parent event handlers
  return createPortal(content, document.body);
};

export default FloatingYouTubePlayer;
