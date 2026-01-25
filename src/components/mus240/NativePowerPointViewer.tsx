import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Minimize2,
  Presentation,
  Loader2,
  AlertCircle,
  Grid3X3,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';
import { parsePowerPoint, type PPTXParseResult, type ParsedSlide } from '@/lib/pptx-parser';
import { cn } from '@/lib/utils';
import { SlideRenderer } from '@/components/powerpoint/SlideRenderer';

interface NativePowerPointViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  title: string;
}

export function NativePowerPointViewer({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName, 
  title 
}: NativePowerPointViewerProps) {
  const [presentation, setPresentation] = useState<PPTXParseResult | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse the PPTX file when opened
  useEffect(() => {
    if (isOpen && fileUrl) {
      setIsLoading(true);
      setError(null);
      setCurrentSlide(0);
      
      parsePowerPoint(fileUrl)
        .then((result) => {
          setPresentation(result);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to parse PowerPoint:', err);
          setError(err.message || 'Failed to parse PowerPoint file');
          setIsLoading(false);
        });
    }
  }, [isOpen, fileUrl]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || !presentation) return;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        setCurrentSlide(prev => Math.min(prev + 1, presentation.slideCount - 1));
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        setCurrentSlide(prev => Math.max(prev - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setCurrentSlide(0);
        break;
      case 'End':
        e.preventDefault();
        setCurrentSlide(presentation.slideCount - 1);
        break;
      case 'Escape':
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
        break;
      case 'f':
      case 'F':
        setIsFullscreen(prev => !prev);
        break;
    }
  }, [isOpen, presentation, isFullscreen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setShowThumbnails(false);
  };

  // Handle audio for current slide
  const currentSlideData = presentation?.slides[currentSlide];
  const slideAudio = currentSlideData?.audio?.[0]; // Get first audio on slide

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle slide change - pause audio when changing slides
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, [currentSlide]);

  const renderSlide = (slide: ParsedSlide) => {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <SlideRenderer
          slide={slide}
          slideSize={presentation?.slideSize}
          className="absolute inset-0"
        />

        {/* Audio player for slide */}
        {slide.audio && slide.audio.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3 shadow-lg border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleAudio}
            >
              {isAudioPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {slide.audio[0].name || 'Audio'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <audio
              ref={audioRef}
              src={slide.audio[0].src}
              onPlay={() => setIsAudioPlaying(true)}
              onPause={() => setIsAudioPlaying(false)}
              onEnded={() => setIsAudioPlaying(false)}
            />
          </div>
        )}
        
        {/* Empty slide message */}
        {slide.shapes.length === 0 && slide.images.length === 0 && (!slide.audio || slide.audio.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center">
            <div>
              <Presentation className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>This slide has no displayable content</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderThumbnails = () => {
    if (!presentation) return null;
    
    return (
      <ScrollArea className="h-full">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
          {presentation.slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={cn(
                "relative aspect-[16/9] rounded-lg border-2 overflow-hidden transition-all hover:ring-2 hover:ring-primary/50",
                currentSlide === idx 
                  ? "border-primary ring-2 ring-primary/30" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <div 
                className="absolute inset-0 p-2 text-[6px] overflow-hidden bg-background"
                style={{ backgroundColor: slide.backgroundColor }}
              >
                {slide.shapes.slice(0, 2).map((shape, shapeIdx) => (
                  <p 
                    key={shapeIdx} 
                    className={cn(
                      "truncate",
                      shape.type === 'title' && "font-bold text-[8px]"
                    )}
                  >
                    {shape.text}
                  </p>
                ))}
              </div>
              <div className="absolute bottom-1 right-1 bg-background/80 text-[10px] px-1.5 py-0.5 rounded">
                {idx + 1}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center mb-4">
            <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
          </div>
          <p className="text-muted-foreground">Parsing PowerPoint presentation...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment for large files</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="bg-destructive/10 rounded-full p-6 mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Presentation</h3>
          <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
          <Button variant="outline" onClick={() => {
            setIsLoading(true);
            setError(null);
            parsePowerPoint(fileUrl)
              .then(setPresentation)
              .catch(err => setError(err.message))
              .finally(() => setIsLoading(false));
          }}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!presentation || presentation.slideCount === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <Presentation className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Slides Found</h3>
          <p className="text-muted-foreground">This presentation appears to be empty.</p>
        </div>
      );
    }

    if (showThumbnails) {
      return renderThumbnails();
    }

    return renderSlide(presentation.slides[currentSlide]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "flex flex-col",
          isFullscreen 
            ? "max-w-[100vw] max-h-[100vh] w-screen h-screen rounded-none" 
            : "max-w-4xl max-h-[70vh] h-[70vh]"
        )}
        aria-describedby="pptx-viewer-description"
      >
        <span id="pptx-viewer-description" className="sr-only">
          PowerPoint presentation viewer with slide navigation
        </span>
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold truncate max-w-md">
                {presentation?.title || title}
              </DialogTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                <Presentation className="h-3 w-3" />
                PowerPoint
              </Badge>
              {presentation && (
                <Badge variant="secondary" className="text-xs">
                  {presentation.slideCount} slides
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowThumbnails(!showThumbnails)}
                title="Toggle thumbnails (G)"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30 rounded-lg relative">
          {renderContent()}
        </div>

        {/* Navigation footer */}
        {presentation && !isLoading && !showThumbnails && (
          <div className="flex-shrink-0 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
                disabled={currentSlide === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Slide {currentSlide + 1} of {presentation.slideCount}
                </span>
                <div className="flex gap-1">
                  {presentation.slides.slice(
                    Math.max(0, currentSlide - 2),
                    Math.min(presentation.slideCount, currentSlide + 3)
                  ).map((_, idx) => {
                    const slideIdx = Math.max(0, currentSlide - 2) + idx;
                    return (
                      <button
                        key={slideIdx}
                        onClick={() => setCurrentSlide(slideIdx)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          slideIdx === currentSlide 
                            ? "bg-primary" 
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        )}
                        title={`Go to slide ${slideIdx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlide(prev => Math.min(prev + 1, presentation.slideCount - 1))}
                disabled={currentSlide === presentation.slideCount - 1}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-2">
              Use arrow keys or space to navigate • Press F for fullscreen • Press G for thumbnails
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
