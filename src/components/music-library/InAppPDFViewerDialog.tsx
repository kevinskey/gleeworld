import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scissors, X } from "lucide-react";
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { PDFCropEditor } from '@/components/glee-library/PDFCropEditor';
import { useUserRole } from '@/hooks/useUserRole';

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
  const { isAdmin, profile } = useUserRole();
  const [showCropEditor, setShowCropEditor] = useState(false);

  const canCropPDF = useMemo(() => {
    return (
      isAdmin() ||
      profile?.is_super_admin ||
      profile?.exec_board_role?.toLowerCase() === 'librarian' ||
      profile?.role?.toLowerCase() === 'librarian'
    );
  }, [isAdmin, profile]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        console.log('InAppPDFViewerDialog onOpenChange:', nextOpen);
        onOpenChange(nextOpen);
        if (!nextOpen) setShowCropEditor(false);
      }}
      modal={false}
    >
      <DialogContent
        className="w-[90vw] max-w-[90vw] h-[90vh] p-0 z-[9999]"
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
          <div className="px-2 py-1 border-b flex items-center gap-2">
            <h2 className="text-xs font-semibold text-foreground truncate flex-1">
              {showCropEditor ? `Crop: ${title ?? 'PDF'}` : (title ?? 'PDF')}
            </h2>

            {pdfUrl && canCropPDF && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCropEditor((v) => !v)}
                aria-label={showCropEditor ? 'Back to PDF viewer' : 'Open PDF crop editor'}
              >
                <Scissors className="h-4 w-4 mr-1" />
                {showCropEditor ? 'Back' : 'Crop'}
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close PDF viewer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {showCropEditor ? (
              <PDFCropEditor
                pdfUrl={pdfUrl}
                title={title ?? 'PDF Document'}
                onClose={() => setShowCropEditor(false)}
              />
            ) : (
              <PDFViewerWithAnnotations
                pdfUrl={pdfUrl}
                musicId={musicId}
                musicTitle={title}
                className="h-full"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

