import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Images, ChevronLeft, ChevronRight, Maximize2, Play, Pause, 
  Volume2, VolumeX, Grid3X3, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parsePowerPoint, type PPTXParseResult, type ParsedSlide } from '@/lib/pptx-parser';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
import { SlideRenderer } from '@/components/powerpoint/SlideRenderer';

interface CoursePptSliderProps {
  presentationUrl: string;
  presentationTitle?: string;
  className?: string;
}

export const CoursePptSlider: React.FC<CoursePptSliderProps> = ({ 
  presentationUrl,
  presentationTitle = 'Presentation',
  className
}) => {
  const [presentation, setPresentation] = useState<PPTXParseResult | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Load PowerPoint on mount
  useEffect(() => {
    const loadPresentation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // parsePowerPoint takes a URL string and handles fetching internally
        const result = await parsePowerPoint(presentationUrl);
        setPresentation(result);
      } catch (err) {
        console.error('Failed to load PowerPoint:', err);
        setError(err instanceof Error ? err.message : 'Failed to load presentation');
      } finally {
        setIsLoading(false);
      }
    };

    if (presentationUrl) {
      loadPresentation();
    }

    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [presentationUrl]);

  const goToSlide = useCallback((index: number) => {
    if (!presentation) return;
    // Stop current audio when changing slides
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
    setCurrentSlide(Math.max(0, Math.min(index, presentation.slides.length - 1)));
  }, [presentation]);

  const goNext = useCallback(() => {
    if (!presentation) return;
    goToSlide(currentSlide + 1);
  }, [presentation, currentSlide, goToSlide]);

  const goPrev = useCallback(() => {
    if (!presentation) return;
    goToSlide(currentSlide - 1);
  }, [presentation, currentSlide, goToSlide]);

  const toggleAudio = useCallback(() => {
    forceUnlockAudio();
    const slide = presentation?.slides[currentSlide];
    if (!slide?.audio?.length) return;

    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play();
        setIsAudioPlaying(true);
      }
    } else {
      // SlideAudio uses 'src' property, not 'url'
      const audio = new Audio(slide.audio[0].src);
      audio.volume = isMuted ? 0 : 1;
      audioRef.current = audio;
      audio.play();
      setIsAudioPlaying(true);
      audio.onended = () => setIsAudioPlaying(false);
    }
  }, [presentation, currentSlide, isAudioPlaying, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (audioRef.current) {
        audioRef.current.volume = prev ? 1 : 0;
      }
      return !prev;
    });
  }, []);

  // Render a single slide content
  const renderSlideContent = (slide: ParsedSlide, compact: boolean = false) => {
    return (
      <SlideRenderer
        slide={slide}
        slideSize={presentation?.slideSize}
        className={cn(
          "relative w-full h-full overflow-hidden",
          compact ? "p-0" : "p-0"
        )}
      />
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Images className="h-4 w-4 text-primary" />
            {presentationTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading slides...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !presentation) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Images className="h-4 w-4 text-primary" />
            {presentationTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{error || 'No slides available'}</p>
        </CardContent>
      </Card>
    );
  }

  const slide = presentation.slides[currentSlide];
  const hasAudio = slide?.audio && slide.audio.length > 0;

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
              onClick={() => setShowThumbnails(true)}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          {/* Slide Display */}
          <div 
            className="relative h-56 md:h-64 bg-muted cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          >
            {slide && renderSlideContent(slide, true)}
            
            {/* Audio indicator */}
            {hasAudio && (
              <div className="absolute bottom-2 right-2 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 gap-1 bg-background/80 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAudio();
                  }}
                >
                  {isAudioPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <span className="text-xs">Audio</span>
                </Button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goPrev}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1.5">
              {presentation.slides.map((_, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === currentSlide 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  onClick={() => goToSlide(idx)}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goNext}
              disabled={currentSlide === presentation.slides.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 flex flex-col">
          <VisuallyHidden>
            <DialogTitle>{presentationTitle}</DialogTitle>
          </VisuallyHidden>
          
          <div className="flex-1 relative overflow-hidden">
            {slide && renderSlideContent(slide, false)}
            
            {/* Audio controls in fullscreen */}
            {hasAudio && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3 shadow-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleAudio}
                >
                  {isAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {slide.audio?.[0]?.name || 'Audio'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            )}
            
            {/* Fullscreen navigation */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goPrev}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goNext}
              disabled={currentSlide === presentation.slides.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Slide indicator */}
          <div className="p-3 bg-muted/50 border-t flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">
              Slide {currentSlide + 1} of {presentation.slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setShowThumbnails(true)}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span className="text-xs">All Slides</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thumbnail Grid Modal */}
      <Dialog open={showThumbnails} onOpenChange={setShowThumbnails}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogTitle>All Slides</DialogTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {presentation.slides.map((s, idx) => (
              <button
                key={idx}
                className={cn(
                  "aspect-video rounded-lg overflow-hidden border-2 transition-colors",
                  idx === currentSlide 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => {
                  goToSlide(idx);
                  setShowThumbnails(false);
                }}
              >
                <div className="w-full h-full bg-white scale-[0.25] origin-top-left" style={{ width: '400%', height: '400%' }}>
                  {renderSlideContent(s, true)}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoursePptSlider;
