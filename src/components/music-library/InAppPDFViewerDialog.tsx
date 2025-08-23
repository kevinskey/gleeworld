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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {title && (
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
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