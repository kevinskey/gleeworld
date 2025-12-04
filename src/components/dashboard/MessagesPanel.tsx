import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const rndRef = useRef<Rnd>(null);
  
  const getInitialDimensions = useCallback(() => {
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
  }, []);

  const [dimensions, setDimensions] = useState(getInitialDimensions);

  useEffect(() => {
    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (isMobile) {
        const mobileWidth = Math.min(viewportWidth * 0.9, 400);
        const mobileHeight = viewportHeight * 0.75;
        setDimensions({
          x: Math.round((viewportWidth - mobileWidth) / 2),
          y: Math.round((viewportHeight - mobileHeight) / 2),
          width: mobileWidth,
          height: mobileHeight,
        });
      } else {
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

  const handleDragStop = useCallback((_e: any, data: { x: number; y: number }) => {
    setDimensions(prev => ({
      ...prev,
      x: data.x,
      y: data.y,
    }));
  }, []);

  const handleResizeStop = useCallback((_e: any, _direction: any, ref: HTMLElement, _delta: any, position: { x: number; y: number }) => {
    setDimensions({
      x: position.x,
      y: position.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight,
    });
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  }, [onClose]);

  return (
    <>
      {isMobile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center m-0 p-0">
          <div className="h-[90dvh] w-[90vw] max-w-[90vw] bg-background shadow-2xl rounded-xl flex flex-col border border-border overflow-hidden m-0 p-0">
            <div className="cursor-default bg-[hsl(var(--message-header))] text-white px-3 py-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium ml-2">Messages</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 pointer-events-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <GroupMessageInterface />
            </div>
          </div>
        </div>
      ) : (
        <Rnd
          ref={rndRef}
          default={{
            x: dimensions.x,
            y: dimensions.y,
            width: dimensions.width,
            height: dimensions.height,
          }}
          minWidth={400}
          minHeight={300}
          className="z-50"
          style={{ 
            position: 'fixed',
            willChange: 'transform',
          }}
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
          <div 
            className="h-full bg-background shadow-2xl rounded-xl flex flex-col border border-border overflow-hidden"
            style={{ willChange: 'auto' }}
          >
            <div className="drag-handle cursor-move bg-[hsl(var(--message-header))] text-white px-3 py-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div 
                    className="no-drag w-3 h-3 rounded-full bg-white/30 hover:bg-red-500 transition-colors cursor-pointer" 
                    onClick={handleClose} 
                  />
                  <div className="w-3 h-3 rounded-full bg-white/30" />
                  <div className="w-3 h-3 rounded-full bg-white/30" />
                </div>
                <span className="text-sm font-medium ml-2">Messages</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="no-drag h-8 w-8 rounded-full text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <GroupMessageInterface />
            </div>
          </div>
        </Rnd>
      )}
    </>
  );
};
