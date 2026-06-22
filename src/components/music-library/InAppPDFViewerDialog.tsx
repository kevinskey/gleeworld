import React, { useState } from 'react';
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
  // "Fullscreen" here means fill the browser window only — not the whole
  // monitor — so it's a CSS state toggle, not a Fullscreen API call.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => setIsFullscreen((v) => !v);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setIsFullscreen(false);
        onOpenChange(nextOpen);
      }}
      modal={false}
    >
      <DialogContent
        // Hide the default Radix close button — we render our own bigger,
        // properly-spaced close + fullscreen pair in the header below so
        // they don't overlap or undershoot iOS 44pt touch targets.
        className={`p-0 z-[9999] flex flex-col gap-0 bg-background [&>button]:hidden ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none'
            : 'w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh]'
        }`}
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
        {/* Header — h-11 buttons hit Apple's 44pt touch target; the gap keeps
            X and fullscreen from overlapping on a narrow iPhone header. */}
        <div className="px-3 py-1.5 border-b flex items-center gap-3 flex-shrink-0 bg-background">
          <h2 className="text-sm font-medium text-foreground truncate flex-1">
            {title ?? 'Sheet Music'}
          </h2>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 md:h-12 md:w-12 shrink-0"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5 md:h-6 md:w-6" /> : <Maximize2 className="h-5 w-5 md:h-6 md:w-6" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 md:h-12 md:w-12 shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label="Close PDF viewer"
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
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
