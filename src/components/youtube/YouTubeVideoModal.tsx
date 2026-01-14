import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface YouTubeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
}

export const YouTubeVideoModal = ({ isOpen, onClose, videoId, title }: YouTubeVideoModalProps) => {
  if (!videoId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-6xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] p-0 bg-black border-none shadow-2xl rounded-xl overflow-hidden"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <VisuallyHidden>
          <DialogTitle>{title || 'Video Player'}</DialogTitle>
        </VisuallyHidden>
        <div className="relative">
          {/* Close button - visible and accessible on all devices */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full h-10 w-10 sm:h-8 sm:w-8"
            onClick={onClose}
            aria-label="Close video"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
          
          {/* Video title bar */}
          {title && (
            <div className="absolute top-0 left-0 right-12 z-10 bg-gradient-to-b from-black/80 to-transparent p-3 sm:p-4">
              <h3 className="text-white text-sm sm:text-base font-medium line-clamp-1">{title}</h3>
            </div>
          )}
          
          {/* Responsive video container */}
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={title || 'YouTube Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
          
          {/* Bottom tap-to-close hint on mobile */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-center">
            <p className="text-white/60 text-xs">Tap X or outside to close</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeVideoModal;
