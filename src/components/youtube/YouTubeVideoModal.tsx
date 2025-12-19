import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-none">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-10 right-0 text-white hover:bg-white/20 z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={title || 'YouTube Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeVideoModal;
