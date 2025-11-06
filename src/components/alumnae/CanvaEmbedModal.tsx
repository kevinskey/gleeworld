import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";
import { ExternalLink, FileDown } from "lucide-react";

interface CanvaEmbedModalProps {
  open: boolean;
  onClose: () => void;
  onPdfReady?: (file: File) => void;
  title?: string;
}

export const CanvaEmbedModal = ({ open, onClose, title }: CanvaEmbedModalProps) => {
  useEffect(() => {
    if (open) {
      // Open Canva in a new window
      const canvaUrl = "https://www.canva.com/create/newsletters/";
      window.open(canvaUrl, 'canva-editor', 'width=1200,height=800');
      
      toast.info("Canva opened in a new window. Follow the steps below to complete your design.", {
        duration: 6000
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Design Your Newsletter in Canva
          </DialogTitle>
          <DialogDescription>
            Follow these steps to create and download your newsletter
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Browse Newsletter Templates</p>
                <p className="text-sm text-muted-foreground">Select a template that fits your style or start from scratch</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Customize Your Design</p>
                <p className="text-sm text-muted-foreground">Edit text, add images, adjust colors and fonts to match your brand</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Download as PDF</p>
                <p className="text-sm text-muted-foreground">
                  Click <span className="font-medium text-foreground">Share → Download → PDF</span> format
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Upload Here</p>
                <p className="text-sm text-muted-foreground">Return to this page and upload the PDF using the file picker below</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                window.open("https://www.canva.com/create/newsletters/", 'canva-editor', 'width=1200,height=800');
                toast.success("Canva reopened in new window");
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Reopen Canva
            </Button>

            <Button onClick={onClose}>
              <FileDown className="h-4 w-4 mr-2" />
              Done - Upload PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
