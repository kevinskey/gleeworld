import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Images, Maximize2, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface CoursePptSliderProps {
  presentationUrl: string;
  presentationTitle?: string;
  className?: string;
}

/**
 * Office Online embed viewer for PowerPoint files.
 * Requires files to be publicly accessible via URL.
 */
export const CoursePptSlider: React.FC<CoursePptSliderProps> = ({ 
  presentationUrl,
  presentationTitle = 'Presentation',
  className
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Build Office Online embed URL
  const getOfficeEmbedUrl = () => {
    // Office Online viewer requires a publicly accessible URL
    const encodedUrl = encodeURIComponent(presentationUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Unable to load presentation. The file may not be publicly accessible.');
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryKey(prev => prev + 1);
  };

  const openInNewTab = () => {
    window.open(getOfficeEmbedUrl(), '_blank', 'noopener,noreferrer');
  };

  const embedUrl = getOfficeEmbedUrl();

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Images className="h-4 w-4 text-primary" />
            {presentationTitle}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={openInNewTab}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowFullscreen(true)}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          {/* Compact Embed Display */}
          <div 
            className="relative h-56 md:h-64 bg-muted cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading presentation...</span>
                </div>
              </div>
            )}
            
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                <p className="text-sm text-muted-foreground text-center">{error}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={openInNewTab}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open External
                  </Button>
                </div>
              </div>
            ) : (
              <iframe
                key={retryKey}
                src={embedUrl}
                className="w-full h-full border-0"
                title={presentationTitle}
                onLoad={handleLoad}
                onError={handleError}
                allowFullScreen
              />
            )}
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-center px-3 py-2 bg-muted/50 border-t">
            <span className="text-xs text-muted-foreground">
              Powered by Office Online
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <VisuallyHidden>
            <DialogTitle>{presentationTitle}</DialogTitle>
          </VisuallyHidden>
          
          <div className="flex-1 relative overflow-hidden">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              title={presentationTitle}
              allowFullScreen
            />
          </div>
          
          {/* Footer with actions */}
          <div className="p-3 bg-muted/50 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{presentationTitle}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open in New Tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoursePptSlider;
