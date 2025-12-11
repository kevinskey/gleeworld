import React, { useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [size, setSize] = useState({ width: 400, height: 280 });
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 340 });

  const handleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  return (
    <Rnd
      default={{
        x: position.x,
        y: position.y,
        width: size.width,
        height: isMinimized ? 48 : size.height,
      }}
      minWidth={280}
      minHeight={isMinimized ? 48 : 200}
      maxWidth={800}
      maxHeight={600}
      bounds="window"
      dragHandleClassName="drag-handle"
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
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
      style={{ zIndex: 9999 }}
    >
      <div className={cn(
        "flex flex-col bg-card border border-border rounded-lg shadow-xl overflow-hidden",
        "h-full w-full"
      )}>
        {/* Header - Drag Handle */}
        <div className="drag-handle flex items-center justify-between px-3 py-2 bg-primary cursor-move select-none">
          <div className="flex items-center gap-2 text-primary-foreground">
            <GripHorizontal className="h-4 w-4 opacity-60" />
            <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={handleMinimize}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-destructive hover:text-destructive-foreground"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* YouTube Embed */}
        {!isMinimized && (
          <div className="flex-1 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&rel=0`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        )}
      </div>
    </Rnd>
  );
};

export default FloatingYouTubePlayer;
