import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMessageInterface } from '@/components/notifications/GroupMessageInterface';
import { Rnd } from 'react-rnd';
import { useIsMobile } from '@/hooks/use-mobile';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  const isMobile = useIsMobile();
  const [dimensions, setDimensions] = useState(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 900;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    const width = Math.min(900, viewportWidth - 40);
    const height = Math.min(viewportHeight * 0.8, viewportHeight - 40);
    return {
      x: Math.round((viewportWidth - width) / 2),
      y: Math.round((viewportHeight - height) / 2),
      width,
      height,
    };
  });

  useEffect(() => {
    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (isMobile) {
        // Mobile: Centered with 90% width
        const mobileWidth = Math.min(viewportWidth * 0.9, 400);
        const mobileHeight = viewportHeight * 0.75;
        setDimensions({
          x: Math.round((viewportWidth - mobileWidth) / 2),
          y: Math.round((viewportHeight - mobileHeight) / 2),
          width: mobileWidth,
          height: mobileHeight,
        });
      } else {
        // Desktop/Tablet: absolute center in viewport
        const desktopWidth = Math.min(900, viewportWidth - 40);
        const desktopHeight = Math.min(viewportHeight * 0.8, viewportHeight - 40);
        setDimensions({
          x: Math.round((viewportWidth - desktopWidth) / 2),
          y: Math.round((viewportHeight - desktopHeight) / 2),
          width: desktopWidth,
          height: desktopHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMobile]);

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    setDimensions(prev => ({
      ...prev,
      x: data.x,
      y: data.y,
    }));
  };

  const handleResizeStop = (_e: any, _direction: any, ref: HTMLElement, _delta: any, position: { x: number; y: number }) => {
    setDimensions({
      x: position.x,
      y: position.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight,
    });
  };

  return (
    <>
      {isMobile ? (
        // Mobile: centered overlay without drag/resize to avoid scroll issues
        <div className="fixed inset-0 z-50 flex items-center justify-center m-0 p-0">
          <div className="h-[90dvh] w-[90vw] max-w-[90vw] bg-background shadow-2xl rounded-xl flex flex-col border border-border overflow-hidden m-0 p-0">
            {/* Header */}
            <div className="cursor-default bg-[hsl(var(--message-header))] text-white px-3 py-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium ml-2">Messages</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 pointer-events-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <GroupMessageInterface />
            </div>
          </div>
        </div>
      ) : (
        // Desktop: draggable & resizable panel
        <Rnd
          position={{ x: dimensions.x, y: dimensions.y }}
          size={{ width: dimensions.width, height: dimensions.height }}
          minWidth={400}
          minHeight={300}
          className="z-50"
          style={{ position: 'fixed' }}
          enableResizing={{
            top: true,
            right: true,
            bottom: true,
            left: true,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }}
          disableDragging={false}
          dragHandleClassName="drag-handle"
          enableUserSelectHack={false}
          cancel=".no-drag"
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
        >
          <div className="h-full bg-background shadow-2xl rounded-xl flex flex-col border border-border overflow-hidden">
            {/* Draggable Header - only left side is draggable so the X stays tappable */}
            <div className="cursor-default bg-[hsl(var(--message-header))] text-white px-3 py-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 drag-handle">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-white/30 hover:bg-white/50 transition-colors cursor-pointer" onClick={onClose} />
                  <div className="w-3 h-3 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
                  <div className="w-3 h-3 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
                </div>
                <span className="text-sm font-medium ml-2">Messages</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 pointer-events-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <GroupMessageInterface />
            </div>
          </div>
        </Rnd>
      )}
    </>
  );
};