import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PresentationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  title: string;
}

export const PresentationViewer = ({ isOpen, onClose, fileUrl, fileName, title }: PresentationViewerProps) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [slideDuration, setSlideDuration] = useState(3000); // 3 seconds per slide
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();

  // Simulated slide data - in a real implementation, you'd extract slides from the PowerPoint file
  const slides = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Slide ${i + 1}`,
    content: `This is slide ${i + 1} content from ${fileName}`,
    image: null // Would contain actual slide image in real implementation
  }));

  useEffect(() => {
    setTotalSlides(slides.length);
  }, [slides]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev >= totalSlides) {
            setIsPlaying(false);
            return 1;
          }
          return prev + 1;
        });
      }, slideDuration);
      setPlayInterval(interval);
    } else {
      if (playInterval) {
        clearInterval(playInterval);
        setPlayInterval(null);
      }
    }

    return () => {
      if (playInterval) {
        clearInterval(playInterval);
      }
    };
  }, [isPlaying, slideDuration, totalSlides]);

  const nextSlide = () => {
    setCurrentSlide(prev => Math.min(prev + 1, totalSlides));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 1));
  };

  const goToSlide = (slideNumber: number) => {
    setCurrentSlide(Math.max(1, Math.min(slideNumber, totalSlides)));
  };

  const togglePlayback = () => {
    setIsPlaying(prev => !prev);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: `Downloading ${fileName}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
              <p className="text-sm text-gray-500">Slideshow Presentation</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {currentSlide} of {totalSlides}
              </span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex">
          {/* Main Slide View */}
          <div className="flex-1 flex flex-col bg-gray-100">
            {/* Slide Content */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
              <div 
                className="bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg rounded-lg max-w-full max-h-full flex items-center justify-center border border-slate-600"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease-in-out',
                  width: '800px',
                  height: '600px',
                  aspectRatio: '4/3'
                }}
              >
                {/* Slide Content Placeholder */}
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Slide {currentSlide}
                  </h2>
                  <p className="text-slate-300 mb-4">
                    {fileName}
                  </p>
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <p className="text-sm text-slate-200">
                      <strong className="text-amber-300">Preview Mode:</strong> This is a slideshow interface for PowerPoint presentations. 
                      In a full implementation, actual slide content would be displayed here.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white border-t p-4">
              <div className="flex items-center justify-between">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToSlide(1)}
                    disabled={currentSlide === 1}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevSlide}
                    disabled={currentSlide === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayback}
                    className="min-w-[80px]"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextSlide}
                    disabled={currentSlide === totalSlides}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToSlide(totalSlides)}
                    disabled={currentSlide === totalSlides}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Speed:</label>
                  <select
                    value={slideDuration}
                    onChange={(e) => setSlideDuration(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={1000}>Fast (1s)</option>
                    <option value={2000}>Normal (2s)</option>
                    <option value={3000}>Slow (3s)</option>
                    <option value={5000}>Very Slow (5s)</option>
                  </select>
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[50px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={rotate}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetView}>
                    Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadFile}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Navigator */}
          <div className="w-64 border-l bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Slides</h3>
              <div className="space-y-2">
                {slides.map((slide) => (
                  <button
                    key={slide.id}
                    onClick={() => goToSlide(slide.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      currentSlide === slide.id
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-6 rounded border flex items-center justify-center text-xs ${
                        currentSlide === slide.id
                          ? 'bg-amber-200 border-amber-300 text-amber-800'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}>
                        {slide.id}
                      </div>
                      <span className="text-sm font-medium">
                        Slide {slide.id}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};