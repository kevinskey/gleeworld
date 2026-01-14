import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useState } from 'react';
import { 
  extractYouTubePlaylistId, 
  isYouTubePlaylistUrl, 
  getYouTubePlaylistEmbedUrl,
  getYouTubeWatchUrl 
} from '@/utils/youtubeUtils';

interface YouTubeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
  url?: string; // Original URL for playlist detection
}

export const YouTubeVideoModal = ({ isOpen, onClose, videoId, title, url }: YouTubeVideoModalProps) => {
  const [hasError, setHasError] = useState(false);
  
  // Check if this is a playlist
  const playlistId = url ? extractYouTubePlaylistId(url) : null;
  const isPlaylist = url ? isYouTubePlaylistUrl(url) : false;
  
  // Determine embed URL
  const getEmbedSrc = () => {
    if (isPlaylist && playlistId && !videoId) {
      return getYouTubePlaylistEmbedUrl(playlistId, true);
    }
    // If we have both video and playlist, embed video with playlist context
    if (videoId && playlistId) {
      return `https://www.youtube.com/embed/${videoId}?list=${playlistId}&autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    }
    // Just video
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    }
    return null;
  };
  
  const embedSrc = getEmbedSrc();
  const watchUrl = videoId 
    ? getYouTubeWatchUrl(videoId) + (playlistId ? `&list=${playlistId}` : '')
    : url || `https://www.youtube.com/playlist?list=${playlistId}`;

  if (!videoId && !playlistId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setHasError(false); } }}>
      <DialogContent 
        className="max-w-6xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] p-0 bg-black border-none shadow-2xl rounded-xl overflow-hidden"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <VisuallyHidden>
          <DialogTitle>{title || 'Video Player'}</DialogTitle>
        </VisuallyHidden>
        <div className="relative">
          {/* Close button */}
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
          
          {/* Error state with fallback to YouTube */}
          {hasError ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Video Cannot Be Embedded</h3>
              <p className="text-gray-400 mb-4 max-w-md">
                This video has embedding restrictions. Click below to watch directly on YouTube.
              </p>
              <Button
                onClick={() => window.open(watchUrl, '_blank')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Watch on YouTube
              </Button>
            </div>
          ) : (
            /* Responsive video container */
            <div className="aspect-video w-full">
              {embedSrc ? (
                <iframe
                  src={embedSrc}
                  title={title || 'YouTube Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  onError={() => setHasError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">Unable to Embed</h3>
                  <Button
                    onClick={() => window.open(watchUrl, '_blank')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open on YouTube
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Bottom bar with external link option */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 flex items-center justify-between">
            <p className="text-white/60 text-xs sm:hidden">Tap X to close</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/20 ml-auto"
              onClick={() => window.open(watchUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Open on YouTube</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeVideoModal;
