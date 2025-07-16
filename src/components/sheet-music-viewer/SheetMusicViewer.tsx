import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2,
  Minimize2,
  Share2,
  Star,
  Clock
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicViewerProps {
  sheetMusic: SheetMusic;
  onBack: () => void;
  className?: string;
}

export const SheetMusicViewer: React.FC<SheetMusicViewerProps> = ({
  sheetMusic,
  onBack,
  className
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      if (!sheetMusic.pdf_url) {
        toast({
          title: "Download unavailable",
          description: "PDF file not found",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(sheetMusic.pdf_url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetMusic.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `Downloading ${sheetMusic.title}.pdf`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Unable to download the sheet music",
        variant: "destructive"
      });
    }
  }, [sheetMusic, toast]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share && sheetMusic.pdf_url) {
        await navigator.share({
          title: sheetMusic.title,
          text: `Check out this sheet music: ${sheetMusic.title}`,
          url: sheetMusic.pdf_url
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(sheetMusic.pdf_url || window.location.href);
        toast({
          title: "Link copied",
          description: "Sheet music link copied to clipboard"
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share failed",
        description: "Unable to share the sheet music",
        variant: "destructive"
      });
    }
  }, [sheetMusic, toast]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    toast({
      title: "Loading error",
      description: "Failed to load sheet music PDF",
      variant: "destructive"
    });
  }, [toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case 'd':
            e.preventDefault();
            handleDownload();
            break;
        }
      }
      
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleDownload, isFullscreen]);

  if (!sheetMusic.pdf_url) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Button onClick={onBack} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium mb-2">PDF Not Available</p>
                <p>This sheet music doesn't have a PDF file attached.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-background transition-all duration-300",
      isFullscreen ? "fixed inset-0 z-50" : "relative",
      className
    )}>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div>
              <h1 className="font-semibold text-lg">{sheetMusic.title}</h1>
              {sheetMusic.composer && (
                <p className="text-sm text-muted-foreground">
                  by {sheetMusic.composer}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button onClick={handleZoomOut} variant="ghost" size="sm">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button onClick={handleZoomIn} variant="ghost" size="sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <Button onClick={handleRotate} variant="ghost" size="sm">
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button onClick={handleShare} variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
            
            <Button onClick={handleDownload} variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
            
            <Button onClick={toggleFullscreen} variant="ghost" size="sm">
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {sheetMusic.difficulty_level && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{sheetMusic.difficulty_level}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(sheetMusic.created_at).toLocaleDateString()}</span>
            </div>
            
            {sheetMusic.tags && sheetMusic.tags.length > 0 && (
              <div className="flex items-center gap-2">
                {sheetMusic.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {sheetMusic.tags.length > 3 && (
                  <span className="text-xs">+{sheetMusic.tags.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        <div 
          className="w-full"
          style={{
            height: isFullscreen ? 'calc(100vh - 140px)' : 'calc(100vh - 200px)',
            minHeight: '600px'
          }}
        >
          <iframe
            src={`${sheetMusic.pdf_url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${zoom}&view=FitH`}
            className="w-full h-full border-0"
            title={`${sheetMusic.title} - Sheet Music`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          />
        </div>
      </div>
    </div>
  );
};