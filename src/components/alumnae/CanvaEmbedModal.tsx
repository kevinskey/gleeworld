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
      // Determine the right Canva template URL
      // For hero slides, use banners; for newsletters, use newsletters
      const isHeroSlide = window.location.pathname.includes('alumnae');
      const canvaUrl = isHeroSlide 
        ? "https://www.canva.com/create/banners/" 
        : "https://www.canva.com/create/newsletters/";
      
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
            Design in Canva
          </DialogTitle>
          <DialogDescription>
            Follow these steps to create and download your design
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Browse Templates</p>
                <p className="text-sm text-muted-foreground">Select a template that fits your needs or start from scratch</p>
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
                <p className="font-medium">Download Your Design</p>
                <p className="text-sm text-muted-foreground">
                  Click <span className="font-medium text-foreground">Share → Download → PNG</span> or <span className="font-medium text-foreground">JPG</span> format
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Upload Here</p>
                <p className="text-sm text-muted-foreground">Return to this page and upload the image using the file picker below</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                const isHeroSlide = window.location.pathname.includes('alumnae');
                const canvaUrl = isHeroSlide 
                  ? "https://www.canva.com/create/banners/" 
                  : "https://www.canva.com/create/newsletters/";
                window.open(canvaUrl, 'canva-editor', 'width=1200,height=800');
                toast.success("Canva reopened in new window");
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Reopen Canva
            </Button>

            <Button onClick={onClose}>
              <FileDown className="h-4 w-4 mr-2" />
              Done - Upload Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
