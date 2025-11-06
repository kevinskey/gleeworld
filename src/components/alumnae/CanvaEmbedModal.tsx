import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileDown, Loader2 } from "lucide-react";
import { useCanvaIntegration } from "@/hooks/useCanvaIntegration";

interface CanvaEmbedModalProps {
  open: boolean;
  onClose: () => void;
  onPdfReady?: (file: File) => void;
  title?: string;
}

export const CanvaEmbedModal = ({ open, onClose, title }: CanvaEmbedModalProps) => {
  const [canvaWindow, setCanvaWindow] = useState<Window | null>(null);
  const [manualAuthUrl, setManualAuthUrl] = useState<string | null>(null);
  const { initiateOAuth, loading } = useCanvaIntegration();

  useEffect(() => {
    if (open) {
      // Check for OAuth callback params
      const params = new URLSearchParams(window.location.search);
      const authStatus = params.get('canva_auth');
      
      if (authStatus === 'success') {
        toast.success("Connected to Canva! You can now create designs.");
        window.history.replaceState({}, '', window.location.pathname);
      } else if (authStatus === 'error') {
        toast.error(params.get('error') || "Failed to connect to Canva");
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [open]);

  const handleOpenCanva = async () => {
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?canva_auth=success`;
      const authUrl = await initiateOAuth(returnUrl);
      
      if (authUrl) {
        setManualAuthUrl(authUrl);
        const newWindow = window.open(authUrl, '_blank', 'width=600,height=800');
        setCanvaWindow(newWindow);
        toast.info("Complete authentication in the popup to connect to Canva");
      }
    } catch (error) {
      toast.error("Failed to connect to Canva");
    }
  };

  const handleReopen = () => {
    if (canvaWindow && !canvaWindow.closed) {
      canvaWindow.focus();
    } else {
      handleOpenCanva();
    }
  };

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
              onClick={handleReopen}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {canvaWindow ? 'Reopen Canva' : 'Connect to Canva'}
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
