import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { GleeWorldLanding } from "@/pages/GleeWorldLanding";

interface LandingPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LandingPageModal = ({ open, onOpenChange }: LandingPageModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative w-full h-full overflow-auto bg-background rounded-lg">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-full shadow-lg"
          >
            <X className="h-5 w-5" />
          </Button>
          
          {/* Landing page content */}
          <div className="w-full h-full overflow-auto">
            <GleeWorldLanding />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
