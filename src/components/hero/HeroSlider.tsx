import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type SlideLayout = 'one' | 'two' | 'three';
export type SlideTransition = 'fade' | 'left' | 'right' | 'up' | 'down' | 'zoom';

export interface SlideColumn {
  type: 'text' | 'media' | 'cta';
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonVariant?: 'primary' | 'secondary' | 'outline';
}

export interface HeroSlide {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  ipadImageUrl?: string | null;
  videoUrl?: string | null; // YouTube video URL or ID
  durationMs?: number | null;
  layout: SlideLayout;
  transition: SlideTransition;
  columns?: SlideColumn[];
  // Legacy field support
  buttonText?: string | null;
  buttonUrl?: string | null;
  actionButtonEnabled?: boolean | null;
  actionButtonText?: string | null;
  actionButtonUrl?: string | null;
  // Positioning
  titlePositionHorizontal?: string | null;
  titlePositionVertical?: string | null;
  titleSize?: string | null;
  descriptionPositionHorizontal?: string | null;
  descriptionPositionVertical?: string | null;
  descriptionSize?: string | null;
  imagePositionX?: string | null;
  imagePositionY?: string | null;
}

export interface HeroSliderProps {
  slides: HeroSlide[];
  defaultDurationMs?: number;
  autoplay?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
  showPausePlay?: boolean;
  className?: string;
  onSlideChange?: (index: number) => void;
}

// ============================================================================
// ADAPTER: Convert DB format to component format
// ============================================================================

export function adaptDatabaseSlide(dbSlide: any): HeroSlide {
  return {
    id: dbSlide.id,
    title: dbSlide.title,
    subtitle: dbSlide.subtitle,
    description: dbSlide.description,
    imageUrl: dbSlide.image_url,
    mobileImageUrl: dbSlide.mobile_image_url,
    ipadImageUrl: dbSlide.ipad_image_url,
    videoUrl: dbSlide.video_url, // YouTube video support
    durationMs: dbSlide.slide_duration_seconds ? dbSlide.slide_duration_seconds * 1000 : null,
    layout: (dbSlide.layout as SlideLayout) || 'one',
    transition: (dbSlide.transition as SlideTransition) || 'fade',
    buttonText: dbSlide.button_text,
    buttonUrl: dbSlide.link_url,
    actionButtonEnabled: dbSlide.action_button_enabled,
    actionButtonText: dbSlide.action_button_text,
    actionButtonUrl: dbSlide.action_button_url,
    titlePositionHorizontal: dbSlide.title_position_horizontal,
    titlePositionVertical: dbSlide.title_position_vertical,
    titleSize: dbSlide.title_size,
    descriptionPositionHorizontal: dbSlide.description_position_horizontal,
    descriptionPositionVertical: dbSlide.description_position_vertical,
    descriptionSize: dbSlide.description_size,
    imagePositionX: dbSlide.image_position_x,
    imagePositionY: dbSlide.image_position_y,
  };
}

// ============================================================================
// HOOKS
// ============================================================================

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTransitionClasses = (
  transition: SlideTransition,
  isActive: boolean,
  isExiting: boolean,
  reducedMotion: boolean
): string => {
  if (reducedMotion) {
    return isActive ? 'opacity-100' : 'opacity-0';
  }

  const baseClasses = 'transition-all duration-700 ease-out';
  
  if (isActive) {
    return `${baseClasses} opacity-100 translate-x-0 translate-y-0 scale-100`;
  }
  
  if (isExiting) {
    switch (transition) {
      case 'left':
        return `${baseClasses} opacity-0 -translate-x-full`;
      case 'right':
        return `${baseClasses} opacity-0 translate-x-full`;
      case 'up':
        return `${baseClasses} opacity-0 -translate-y-full`;
      case 'down':
        return `${baseClasses} opacity-0 translate-y-full`;
      case 'zoom':
        return `${baseClasses} opacity-0 scale-110`;
      case 'fade':
      default:
        return `${baseClasses} opacity-0`;
    }
  }

  // Incoming (not yet active)
  switch (transition) {
    case 'left':
      return `${baseClasses} opacity-0 translate-x-full`;
    case 'right':
      return `${baseClasses} opacity-0 -translate-x-full`;
    case 'up':
      return `${baseClasses} opacity-0 translate-y-full`;
    case 'down':
      return `${baseClasses} opacity-0 -translate-y-full`;
    case 'zoom':
      return `${baseClasses} opacity-0 scale-90`;
    case 'fade':
    default:
      return `${baseClasses} opacity-0`;
  }
};

const getLayoutClasses = (layout: SlideLayout): string => {
  switch (layout) {
    case 'two':
      return 'grid-cols-1 md:grid-cols-2';
    case 'three':
      return 'grid-cols-1 md:grid-cols-3';
    case 'one':
    default:
      return 'grid-cols-1';
  }
};

const getHorizontalAlignment = (position: string | null): string => {
  switch (position) {
    case 'left':
      return 'text-left items-start';
    case 'right':
      return 'text-right items-end';
    case 'center':
    default:
      return 'text-center items-center';
  }
};

const getVerticalAlignment = (position: string | null): string => {
  switch (position) {
    case 'top':
      return 'justify-start pt-8 md:pt-16';
    case 'bottom':
      return 'justify-end pb-8 md:pb-16';
    case 'middle':
    default:
      return 'justify-center';
  }
};

const getTitleSize = (size: string | null): string => {
  switch (size) {
    case 'small':
      return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
    case 'medium':
      return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
    case 'large':
      return 'text-2xl sm:text-3xl md:text-4xl lg:text-6xl';
    case 'xl':
      return 'text-3xl sm:text-4xl md:text-5xl lg:text-7xl';
    default:
      return 'text-2xl sm:text-3xl md:text-4xl lg:text-6xl';
  }
};

const getDescriptionSize = (size: string | null): string => {
  switch (size) {
    case 'small':
      return 'text-sm sm:text-base';
    case 'medium':
      return 'text-base sm:text-lg';
    case 'large':
      return 'text-lg sm:text-xl';
    case 'xl':
      return 'text-xl sm:text-2xl';
    default:
      return 'text-base sm:text-lg md:text-xl';
  }
};

// ============================================================================
// HELPER: Extract YouTube video ID from various URL formats
// ============================================================================

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Already just an ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  // Standard YouTube URLs
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface SlideMediaProps {
  slide: HeroSlide;
  fallbackSrc: string;
  isPlaying: boolean;
}

const SlideMedia: React.FC<SlideMediaProps> = ({ slide, fallbackSrc, isPlaying }) => {
  const defaultImage = fallbackSrc;
  const videoId = slide.videoUrl ? extractYouTubeVideoId(slide.videoUrl) : null;
  
  // If there's a valid YouTube video URL, render the video
  if (videoId) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
          title={slide.title || 'Hero video'}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            // Scale up to cover the container and hide YouTube UI elements
            width: '150%',
            height: '150%',
            left: '-25%',
            top: '-25%',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Overlay to prevent interaction and hide any remaining UI */}
        <div className="absolute inset-0 pointer-events-none" />
      </div>
    );
  }
  
  // Otherwise render images
  return (
    <>
      {(() => {
        const objectPosition = `${slide.imagePositionX || 'center'} ${slide.imagePositionY || 'center'}`;
        return (
          <>
            {/* Desktop Image */}
            <img
              src={slide.imageUrl || defaultImage}
              alt={slide.title || 'Hero slide'}
              className="hidden md:block absolute inset-0 w-full h-full object-cover brightness-95"
              style={{ objectPosition }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultImage;
              }}
            />
            {/* Tablet Image */}
            <img
              src={slide.ipadImageUrl || slide.imageUrl || defaultImage}
              alt={slide.title || 'Hero slide'}
              className="hidden sm:block md:hidden absolute inset-0 w-full h-full object-cover brightness-95"
              style={{ objectPosition }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultImage;
              }}
            />
            {/* Mobile Image */}
            <img
              src={slide.mobileImageUrl || slide.imageUrl || defaultImage}
              alt={slide.title || 'Hero slide'}
              className="block sm:hidden absolute inset-0 w-full h-full object-cover brightness-95"
              style={{ objectPosition }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultImage;
              }}
            />
          </>
        );
      })()}
    </>
  );
};

interface SlideContentProps {
  slide: HeroSlide;
}

const SlideContent: React.FC<SlideContentProps> = ({ slide }) => {
  const buttonText = slide.actionButtonEnabled 
    ? slide.actionButtonText 
    : slide.buttonText;
  const buttonUrl = slide.actionButtonEnabled 
    ? slide.actionButtonUrl 
    : slide.buttonUrl;
  const showButton = slide.actionButtonEnabled 
    ? (slide.actionButtonText && slide.actionButtonUrl)
    : (slide.buttonText && slide.buttonUrl);

  // For multi-column layouts
  if (slide.layout !== 'one' && slide.columns && slide.columns.length > 0) {
    return (
      <div className={cn(
        'absolute inset-0 grid gap-4 p-4 md:p-8 lg:p-12',
        getLayoutClasses(slide.layout)
      )}>
        {slide.columns.map((col, idx) => (
          <div 
            key={idx} 
            className="flex flex-col justify-center items-center text-center p-2 md:p-4"
          >
            {col.type === 'media' && col.imageUrl && (
              <img 
                src={col.imageUrl} 
                alt={col.title || ''} 
                className="max-h-48 md:max-h-64 object-contain rounded-lg shadow-lg"
              />
            )}
            {col.title && (
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-primary-foreground drop-shadow-lg mt-2">
                {col.title}
              </h3>
            )}
            {col.description && (
              <p className="text-sm md:text-base text-primary-foreground/90 drop-shadow mt-1 max-w-md">
                {col.description}
              </p>
            )}
            {col.type === 'cta' && col.buttonText && col.buttonUrl && (
              <Button 
                size="lg" 
                className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl"
                asChild
              >
                <a href={col.buttonUrl} target="_blank" rel="noopener noreferrer">
                  {col.buttonText}
                </a>
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Single column layout (legacy/default)
  return (
    <div className="absolute inset-0">
      {/* Title Section */}
      {slide.title && (
        <div className={cn(
          'absolute inset-0 flex px-4 sm:px-6 md:px-8 lg:px-12 pointer-events-none',
          getVerticalAlignment(slide.titlePositionVertical),
          getHorizontalAlignment(slide.titlePositionHorizontal)
        )}>
          <h1 className={cn(
            'font-bold text-primary-foreground max-w-5xl pointer-events-auto drop-shadow-2xl leading-tight',
            getTitleSize(slide.titleSize)
          )}>
            {slide.title}
          </h1>
        </div>
      )}

      {/* Description Section */}
      {slide.description && (
        <div className={cn(
          'absolute inset-0 flex px-4 sm:px-6 md:px-8 lg:px-12 pointer-events-none',
          getVerticalAlignment(slide.descriptionPositionVertical),
          getHorizontalAlignment(slide.descriptionPositionHorizontal)
        )}>
          <p className={cn(
            'text-primary-foreground/90 max-w-3xl pointer-events-auto drop-shadow-lg leading-relaxed',
            getDescriptionSize(slide.descriptionSize)
          )}>
            {slide.description}
          </p>
        </div>
      )}

      {/* Action Button */}
      {showButton && (
        <div className="absolute inset-0 flex justify-center items-end pb-4 sm:pb-6 md:pb-10 px-4 pointer-events-none">
          <Button 
            size="lg" 
            className="pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl font-semibold border-2 border-primary-foreground/20"
            asChild
          >
            <a href={buttonUrl || '#'} target="_blank" rel="noopener noreferrer">
              {buttonText}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides,
  defaultDurationMs = 6000,
  autoplay = true,
  showControls = true,
  showProgress = true,
  showPausePlay = true,
  className,
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  const prefersReducedMotion = usePrefersReducedMotion();

  const fallbackImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

  const currentSlide = slides[currentIndex];
  const slideDuration = currentSlide?.durationMs ?? defaultDurationMs;

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // Go to specific slide
  const goToSlide = useCallback((index: number) => {
    if (index === currentIndex || slides.length <= 1) return;
    
    clearTimers();
    setPreviousIndex(currentIndex);
    setCurrentIndex(index);
    setProgress(0);
    onSlideChange?.(index);
  }, [currentIndex, slides.length, clearTimers, onSlideChange]);

  // Navigation handlers
  const goNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % slides.length;
    goToSlide(nextIndex);
  }, [currentIndex, slides.length, goToSlide]);

  const goPrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
  }, [currentIndex, slides.length, goToSlide]);

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) {
      clearTimers();
      return;
    }

    // Progress bar update
    const progressInterval = 50;
    let elapsed = 0;
    
    progressRef.current = setInterval(() => {
      elapsed += progressInterval;
      setProgress((elapsed / slideDuration) * 100);
    }, progressInterval);

    // Auto-advance timer
    timerRef.current = setTimeout(() => {
      goNext();
    }, slideDuration);

    return clearTimers;
  }, [isPlaying, currentIndex, slideDuration, slides.length, goNext, clearTimers]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && 
          document.activeElement !== document.body) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case ' ':
          if (showPausePlay) {
            e.preventDefault();
            setIsPlaying(p => !p);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, showPausePlay]);

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  // Clear previous index after transition
  useEffect(() => {
    if (previousIndex !== null) {
      const timer = setTimeout(() => {
        setPreviousIndex(null);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [previousIndex]);

  if (!slides || slides.length === 0) {
    return (
      <div className={cn(
        'relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[21/9] bg-muted flex items-center justify-center',
        className
      )}>
        <p className="text-muted-foreground">No slides available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[21/9] xl:aspect-[21/8] max-h-[85vh] overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero slideshow"
      tabIndex={0}
    >
      {/* Slides */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        const isExiting = index === previousIndex;
        const isVisible = isActive || isExiting;

        if (!isVisible) return null;

        return (
          <div
            key={slide.id}
            className={cn(
              'absolute inset-0',
              getTransitionClasses(slide.transition, isActive, isExiting, prefersReducedMotion)
            )}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${slides.length}`}
            aria-hidden={!isActive}
          >
            {/* Background Media (Image or YouTube Video) */}
            <SlideMedia slide={slide} fallbackSrc={fallbackImage} isPlaying={isActive && isPlaying} />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/20" />
            
            {/* Content */}
            <SlideContent slide={slide} />
          </div>
        );
      })}

      {/* Progress Bar */}
      {showProgress && slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/20">
          <div 
            className="h-full bg-primary-foreground/80 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Navigation Arrows */}
      {showControls && slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/80 backdrop-blur-sm text-foreground rounded-full h-10 w-10 md:h-12 md:w-12 shadow-lg"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/80 backdrop-blur-sm text-foreground rounded-full h-10 w-10 md:h-12 md:w-12 shadow-lg"
            onClick={goNext}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </>
      )}

      {/* Pagination Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300',
                index === currentIndex 
                  ? 'bg-primary-foreground scale-125' 
                  : 'bg-primary-foreground/40 hover:bg-primary-foreground/60'
              )}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Pause/Play Button */}
      {showPausePlay && slides.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-2 md:right-4 bg-background/50 hover:bg-background/80 backdrop-blur-sm text-foreground rounded-full h-8 w-8 md:h-10 md:w-10 shadow-lg"
          onClick={() => setIsPlaying(p => !p)}
          aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          aria-pressed={!isPlaying}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 md:h-5 md:w-5" />
          ) : (
            <Play className="h-4 w-4 md:h-5 md:w-5" />
          )}
        </Button>
      )}
    </div>
  );
};

export default HeroSlider;
