import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  musicId
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { console.log('InAppPDFViewerDialog onOpenChange:', nextOpen); onOpenChange(nextOpen); }} modal={false}>
      <DialogContent 
        className="max-w-7xl h-[90vh] p-0 z-[9999]"
        style={{ zIndex: 9999 }}
        onInteractOutside={(e) => {
          // Prevent closing when interacting with floating YouTube player
          const target = e.target as HTMLElement;
          if (target?.closest('[data-floating-youtube-player]') || target?.closest('iframe[src*="youtube"]')) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on floating YouTube player
          const target = e.target as HTMLElement;
          if (target?.closest('[data-floating-youtube-player]') || target?.closest('iframe[src*="youtube"]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col h-full">
          {title && (
            <div className="px-2 py-1 border-b">
              <h2 className="text-xs font-semibold text-foreground truncate">{title}</h2>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <PDFViewerWithAnnotations 
              pdfUrl={pdfUrl}
              musicId={musicId}
              musicTitle={title}
              className="h-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
