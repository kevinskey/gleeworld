import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        console.log('InAppPDFViewerDialog onOpenChange:', nextOpen);
        onOpenChange(nextOpen);
      }}
      modal={false}
    >
      <DialogContent
        className="w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] p-0 z-[9999] flex flex-col gap-0"
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
        {/* Minimal header - just title and close */}
        <div className="px-3 py-1.5 border-b flex items-center gap-2 flex-shrink-0 bg-background">
          <h2 className="text-sm font-medium text-foreground truncate flex-1">
            {title ?? 'Sheet Music'}
          </h2>
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
