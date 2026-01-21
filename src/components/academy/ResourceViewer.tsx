import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  X, 
  FileText, 
  Video, 
  Music, 
  BookOpen,
  Download,
  Maximize2,
  Loader2,
  Presentation,
  Globe
} from 'lucide-react';
import { useIsPhone } from '@/hooks/use-mobile';
import { NativePowerPointViewer } from '@/components/mus240/NativePowerPointViewer';

interface ResourceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  resource: {
    title: string;
    url: string;
    resource_type: string;
    description?: string | null;
  } | null;
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'video': return Video;
    case 'audio': return Music;
    case 'reading': return BookOpen;
    case 'website': return Globe;
    case 'document':
    default: return FileText;
  }
};

// Check if URL is a YouTube video
const isYouTubeUrl = (url: string) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

// Convert YouTube URL to embed format
const getYouTubeEmbedUrl = (url: string) => {
  let videoId = '';
  
  if (url.includes('youtube.com/watch')) {
    const urlObj = new URL(url);
    videoId = urlObj.searchParams.get('v') || '';
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
  } else if (url.includes('youtube.com/embed/')) {
    return url; // Already an embed URL
  }
  
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

export const ResourceViewer: React.FC<ResourceViewerProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  const isPhone = useIsPhone();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showPptxViewer, setShowPptxViewer] = useState(false);

  // Reset state when resource changes or dialog opens/closes
  useEffect(() => {
    if (isOpen && resource) {
      setError(false);
      setShowPptxViewer(false);
      // Only show loading for embeddable content
      const lowerUrl = resource.url.toLowerCase();
      const isPdf = lowerUrl.includes('.pdf');
      const isPowerPoint = lowerUrl.includes('.ppt') || lowerUrl.includes('.pptx');
      const isVideo = resource.resource_type === 'video' || isYouTubeUrl(resource.url) || resource.url.includes('vimeo');
      const isWebsite = resource.resource_type === 'website';
      const needsIframe = isPdf || isVideo || isWebsite;
      setLoading(needsIframe && !isPowerPoint);
    } else {
      setLoading(false);
      setError(false);
    }
  }, [isOpen, resource?.url]);

  if (!resource) return null;

  const Icon = getResourceIcon(resource.resource_type);
  const lowerUrl = resource.url.toLowerCase();
  const isPdf = lowerUrl.includes('.pdf');
  const isPowerPoint = lowerUrl.includes('.ppt') || lowerUrl.includes('.pptx');
  const isYouTube = isYouTubeUrl(resource.url);
  const isVideo = resource.resource_type === 'video' || isYouTube || resource.url.includes('vimeo');
  const isAudio = resource.resource_type === 'audio' || resource.url.includes('soundcloud');
  const isWebsite = resource.resource_type === 'website';
  const isExternalReading = resource.resource_type === 'reading' ||
    resource.url.includes('bible.usccb.org') ||
    resource.url.includes('usccb.org');

  // Use Google Docs Viewer for PDFs, YouTube embed for videos
  const getEmbedUrl = () => {
    if (isPdf) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(resource.url)}&embedded=true`;
    }
    if (isYouTube) {
      return getYouTubeEmbedUrl(resource.url);
    }
    return resource.url;
  };

  // Determine what can be embedded in an iframe
  // - PDFs work via Google Docs Viewer
  // - YouTube works with embed URLs
  // - Websites work if they allow framing
  // - PowerPoint files need special handling
  // - External readings/audio open in new tab
  const canEmbed = isPdf || isVideo || isWebsite;
  const shouldShowOpenButton = isExternalReading || isAudio || isPowerPoint;

  const handleOpenExternal = () => {
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Resource Info Header */}
      <div className="flex items-center gap-3 p-3 sm:p-4 border-b bg-muted/30">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base truncate">{resource.title}</h3>
          {resource.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-xs capitalize hidden sm:flex">
            {resource.resource_type}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenExternal}
            className="h-8 text-xs"
          >
            <ExternalLink className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Open External</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading resource...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Unable to display in-app</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This resource cannot be displayed within the app. Click the button below to open it in your browser.
              </p>
              <Button onClick={handleOpenExternal} className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Browser
              </Button>
            </div>
          </div>
        ) : isPowerPoint ? (
          // PowerPoint files get special handling with native slideshow viewer
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-sm">
              <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
                <Presentation className="h-12 w-12 text-primary" />
              </div>
              <h4 className="font-semibold mb-2">{resource.title}</h4>
              {resource.description && (
                <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
              )}
              <p className="text-xs text-muted-foreground mb-4">
                Click below to view the PowerPoint presentation.
              </p>
              <Button onClick={() => setShowPptxViewer(true)} size="lg" className="w-full sm:w-auto">
                <Presentation className="h-4 w-4 mr-2" />
                Open Slideshow
              </Button>
            </div>
          </div>
        ) : canEmbed ? (
          <iframe
            src={getEmbedUrl()}
            className="w-full h-full border-0"
            title={resource.title}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            sandbox={isYouTube ? undefined : "allow-scripts allow-same-origin allow-popups allow-forms"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          // For external readings and audio, show a preview with open button
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-sm">
              <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
                <Icon className="h-12 w-12 text-primary" />
              </div>
              <h4 className="font-semibold mb-2">{resource.title}</h4>
              {resource.description && (
                <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
              )}
              <p className="text-xs text-muted-foreground mb-4">
                {isExternalReading 
                  ? "This reading will open in a new tab for the best experience."
                  : "Click below to access this resource."}
              </p>
              <Button onClick={handleOpenExternal} size="lg" className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Resource
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use Sheet on mobile for full-screen experience, Dialog on desktop
  if (isPhone) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="bottom" 
          className="h-[90dvh] p-0 flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{resource.title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col overflow-hidden" aria-describedby="resource-viewer-desc">
          <span id="resource-viewer-desc" className="sr-only">View resource: {resource.title}</span>
          <DialogHeader className="sr-only">
            <DialogTitle>{resource.title}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>

      {/* Native PowerPoint Viewer for PPTX files */}
      <NativePowerPointViewer
        isOpen={showPptxViewer}
        onClose={() => setShowPptxViewer(false)}
        fileUrl={resource.url}
        fileName={resource.title}
        title={resource.title}
      />
    </>
  );
};

export default ResourceViewer;
