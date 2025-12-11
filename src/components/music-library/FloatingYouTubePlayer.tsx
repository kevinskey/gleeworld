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

  // Stop all events from propagating to parent dialogs
  const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 99999 }}
    >
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
        bounds="parent"
        dragHandleClassName="drag-handle"
        onDragStart={(e) => {
          e.stopPropagation();
        }}
        onDragStop={(e, d) => {
          e.stopPropagation();
          setPosition({ x: d.x, y: d.y });
        }}
        onResizeStart={(e) => {
          e.stopPropagation();
        }}
        onResizeStop={(e, direction, ref, delta, pos) => {
          e.stopPropagation();
          if (!isMinimized) {
            setSize({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
            });
            setPosition(pos);
          }
        }}
        enableResizing={!isMinimized}
        className="!pointer-events-auto"
        style={{ zIndex: 99999 }}
      >
        <div 
          className={cn(
            "flex flex-col bg-card border border-border rounded-lg shadow-xl overflow-hidden",
            "h-full w-full"
          )}
          onMouseDown={stopPropagation}
          onClick={stopPropagation}
        >
          {/* Header - Drag Handle */}
          <div className="drag-handle flex items-center justify-between px-3 py-2 bg-primary cursor-move select-none">
            <div className="flex items-center gap-2 text-primary-foreground">
              <GripHorizontal className="h-4 w-4 opacity-60" />
              <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
            </div>
            <div className="flex items-center gap-1 no-drag">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
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
    </div>
  );
};

export default FloatingYouTubePlayer;
