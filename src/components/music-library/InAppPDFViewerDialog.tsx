import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';

interface InAppPDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  title?: string;
  musicId?: string;
}

export const InAppPDFViewerDialog: React.FC<InAppPDFViewerDialogProps> = ({
  open,
  onOpenChange,
  pdfUrl,
  title,
  musicId,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (dialogRef.current) {
      dialogRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
        onOpenChange(nextOpen);
      }}
      modal={false}
    >
      <DialogContent
        ref={dialogRef}
        className="w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] p-0 z-[9999] flex flex-col gap-0 bg-background"
        style={{ zIndex: 9999 }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest('[data-floating-youtube-player]') || target?.closest('iframe[src*="youtube"]')) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest('[data-floating-youtube-player]') || target?.closest('iframe[src*="youtube"]')) {
            e.preventDefault();
          }
        }}
      >
        {/* Minimal header - title, fullscreen, close */}
        <div className="px-3 py-1.5 border-b flex items-center gap-2 flex-shrink-0 bg-background">
          <h2 className="text-sm font-medium text-foreground truncate flex-1">
            {title ?? 'Sheet Music'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onOpenChange(false)}
            aria-label="Close PDF viewer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Full-height PDF viewer */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <PDFViewerWithAnnotations
            pdfUrl={pdfUrl}
            musicId={musicId}
            musicTitle={title}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
