import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileDown, Palette, Ruler } from "lucide-react";

interface CanvaEmbedModalProps {
  open: boolean;
  onClose: () => void;
  onPdfReady?: (file: File) => void;
  title?: string;
}

export const CanvaEmbedModal = ({ open, onClose, title }: CanvaEmbedModalProps) => {
  const isHero = title?.toLowerCase().includes('hero') || title?.toLowerCase().includes('slide');
  const isBanner = title?.toLowerCase().includes('banner');
  const isNewsletter = title?.toLowerCase().includes('newsletter');

  const getDimensions = () => {
    if (isHero) return { width: 1920, height: 1080, desc: "16:9 aspect ratio for hero images" };
    if (isBanner) return { width: 1200, height: 400, desc: "3:1 aspect ratio for banners" };
    if (isNewsletter) return { width: 816, height: 1056, desc: "Letter size for newsletters" };
    return { width: 1200, height: 630, desc: "Social media friendly" };
  };

  const dimensions = getDimensions();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Design Your {title || 'Image'}
          </DialogTitle>
          <DialogDescription>
            Create your design in any tool, then upload it here
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Recommended Dimensions */}
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Ruler className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Recommended Size</h3>
                <p className="text-2xl font-bold text-primary mt-1">
                  {dimensions.width} × {dimensions.height}px
                </p>
                <p className="text-sm text-muted-foreground mt-1">{dimensions.desc}</p>
              </div>
            </div>
          </div>

          {/* Design Tools */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Suggested Design Tools</h3>
            
            <div className="grid gap-3">
              <a
                href="https://www.canva.com/create/banners/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors group"
              >
                <div>
                  <p className="font-medium">Canva (Free)</p>
                  <p className="text-sm text-muted-foreground">Easy drag-and-drop templates</p>
                </div>
                <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100" />
              </a>

              <a
                href="https://www.photopea.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors group"
              >
                <div>
                  <p className="font-medium">Photopea (Free)</p>
                  <p className="text-sm text-muted-foreground">Like Photoshop, runs in browser</p>
                </div>
                <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100" />
              </a>

              <div className="p-3 border rounded-lg bg-muted/30">
                <p className="font-medium">Or use any design tool you prefer</p>
                <p className="text-sm text-muted-foreground">Figma, Photoshop, mobile apps, etc.</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Quick Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Use PNG for images with transparency</li>
              <li>Use JPG for photos and solid backgrounds</li>
              <li>Keep file size under 5MB for faster loading</li>
              <li>Include Spelman Glee Club branding/colors</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <Button onClick={onClose} variant="default">
              <FileDown className="h-4 w-4 mr-2" />
              Done - Upload Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
