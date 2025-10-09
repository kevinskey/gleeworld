import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">{title || 'Score Viewer'}</h2>
            <Button variant="ghost" size="icon" aria-label="Close viewer" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
