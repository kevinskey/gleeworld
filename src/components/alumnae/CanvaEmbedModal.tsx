import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Download } from "lucide-react";

interface CanvaEmbedModalProps {
  open: boolean;
  onClose: () => void;
  onPdfReady?: (file: File) => void;
  title?: string;
}

export const CanvaEmbedModal = ({ open, onClose, onPdfReady, title }: CanvaEmbedModalProps) => {
  const [embedUrl, setEmbedUrl] = useState("");

  useEffect(() => {
    if (open) {
      // Canva embed URL for newsletter templates
      // Users can browse templates and create designs
      const canvaEmbedUrl = "https://www.canva.com/design/create?category=newsletters&embed";
      setEmbedUrl(canvaEmbedUrl);
    }
  }, [open]);

  const handleDownloadInstructions = () => {
    toast.info(
      "After designing: 1) Click Share → Download → PDF\n2) Save the file\n3) Close this window\n4) Upload the PDF using the file picker",
      { duration: 8000 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle>Design Newsletter in Canva</DialogTitle>
              <DialogDescription>
                Create your newsletter design, then download as PDF
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadInstructions}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Instructions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 w-full h-[calc(95vh-80px)]">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; clipboard-read; clipboard-write"
              title="Canva Design Editor"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading Canva editor...</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/50">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Quick Guide:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Browse and select a newsletter template</li>
              <li>Customize your design (text, images, colors)</li>
              <li>Click <span className="font-medium">Share → Download → PDF</span></li>
              <li>Save the PDF to your computer</li>
              <li>Close this window and upload the PDF below</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
