import React, { useState, useEffect, useCallback } from 'react';
import { useSliderByPlacement } from '@/hooks/useUniversalSlider';
import { HEIGHT_PRESETS, GAP_CLASSES } from '@/types/universal-slider';
import type { SliderWithSlides, UniversalSliderSlide } from '@/types/universal-slider';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UniversalSliderProps {
  placementKey: string;
  className?: string;
  // Override slider settings if needed
  overrideColumns?: 1 | 2 | 3;
  overrideFullWidth?: boolean;
  objectFit?: 'cover' | 'contain';
}

export const UniversalSlider: React.FC<UniversalSliderProps> = ({
  placementKey,
  className,
  overrideColumns,
  overrideFullWidth,
  objectFit = 'cover',
}) => {
  const { data: slider, isLoading } = useSliderByPlacement(placementKey);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const columnCount = overrideColumns ?? slider?.column_count ?? 1;
  const isFullWidth = overrideFullWidth ?? slider?.is_full_width ?? true;

  // Auto-advance slides
  useEffect(() => {
    if (!slider?.auto_play || isPaused || !slider.slides.length) return;

    const currentSlide = slider.slides[currentIndex];
    if (currentSlide?.pause_on_this_slide) return;

    const duration = (currentSlide?.duration_seconds ?? slider.default_slide_duration_seconds) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => 
        slider.loop ? (prev + 1) % slider.slides.length : Math.min(prev + 1, slider.slides.length - 1)
      );
    }, duration);

    return () => clearTimeout(timer);
  }, [slider, currentIndex, isPaused]);

  const goToSlide = useCallback((index: number) => {
    if (!slider) return;
    setCurrentIndex(Math.max(0, Math.min(index, slider.slides.length - 1)));
  }, [slider]);

  const goNext = useCallback(() => {
    if (!slider) return;
    setCurrentIndex((prev) => 
      slider.loop ? (prev + 1) % slider.slides.length : Math.min(prev + 1, slider.slides.length - 1)
    );
  }, [slider]);

  const goPrev = useCallback(() => {
    if (!slider) return;
    setCurrentIndex((prev) => 
      slider.loop ? (prev - 1 + slider.slides.length) % slider.slides.length : Math.max(prev - 1, 0)
    );
  }, [slider]);

  if (isLoading) {
    return <SliderSkeleton />;
  }

  if (!slider || !slider.slides.length) {
    return null;
  }

  const heightConfig = slider.height_preset === 'custom' && slider.custom_height_px 
    ? { mobile: slider.custom_height_px, tablet: slider.custom_height_px, desktop: slider.custom_height_px }
    : HEIGHT_PRESETS[slider.height_preset];

  // For multi-column layouts, show multiple slides at once
  const visibleSlides = columnCount === 1 
    ? [slider.slides[currentIndex]] 
    : slider.slides.slice(currentIndex, currentIndex + columnCount);

  return (
    <div 
      className={cn(
        'relative group',
        isFullWidth ? 'w-full' : 'max-w-7xl mx-auto',
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div 
        className={cn(
          'grid',
          columnCount === 1 && 'grid-cols-1',
          columnCount === 2 && 'grid-cols-1 md:grid-cols-2',
          columnCount === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          GAP_CLASSES[slider.gap_size]
        )}
        style={{
          minHeight: `${heightConfig.mobile}px`,
        }}
      >
        {visibleSlides.map((slide, idx) => (
          <SlideRenderer 
            key={slide.id} 
            slide={slide} 
            heightConfig={heightConfig}
            transition={slider.transition_effect}
            objectFit={objectFit}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      {slider.show_navigation && slider.slides.length > columnCount && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10"
            onClick={goPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10"
            onClick={goNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dot Navigation */}
      {slider.show_dots && slider.slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {slider.slides.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                idx === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              )}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual slide renderer
const SlideRenderer: React.FC<{
  slide: UniversalSliderSlide;
  heightConfig: { mobile: number; tablet: number; desktop: number };
  transition: string;
  objectFit: 'cover' | 'contain';
}> = ({ slide, heightConfig, transition, objectFit }) => {
  const getPositionClasses = (h: string, v: string) => {
    const hMap = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' };
    const vMap = { top: 'justify-start pt-8', center: 'justify-center', bottom: 'justify-end pb-8' };
    return `${hMap[h as keyof typeof hMap] || hMap.center} ${vMap[v as keyof typeof vMap] || vMap.center}`;
  };

  const hasValidLink = slide.link_url && slide.link_url.trim().length > 0;
  const Wrapper = hasValidLink ? 'a' : 'div';
  const wrapperProps = hasValidLink ? { href: slide.link_url, target: slide.link_target, rel: 'noopener noreferrer' } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'relative overflow-hidden rounded-lg',
        slide.link_url && 'cursor-pointer',
        transition === 'fade' && 'animate-in fade-in duration-500'
      )}
      style={{
        height: `clamp(${heightConfig.mobile}px, 50vw, ${heightConfig.desktop}px)`,
      }}
    >
      {/* Background Image */}
      {slide.slide_type === 'image' && slide.image_url && (
        <picture>
          {slide.mobile_image_url && (
            <source media="(max-width: 640px)" srcSet={slide.mobile_image_url} />
          )}
          {slide.tablet_image_url && (
            <source media="(max-width: 1024px)" srcSet={slide.tablet_image_url} />
          )}
          <img
            src={slide.image_url}
            alt={slide.alt_text || slide.title || 'Slide image'}
            className={cn(
              "absolute inset-0 w-full h-full",
              objectFit === 'contain' ? 'object-contain' : 'object-cover'
            )}
            style={{ 
              objectPosition: slide.background_position,
            }}
            loading="lazy"
          />
        </picture>
      )}

      {/* YouTube Embed */}
      {slide.slide_type === 'youtube' && slide.youtube_video_id && (
        <iframe
          src={`https://www.youtube.com/embed/${slide.youtube_video_id}?autoplay=${slide.youtube_autoplay ? 1 : 0}&mute=${slide.youtube_muted ? 1 : 0}&loop=${slide.youtube_loop ? 1 : 0}&playlist=${slide.youtube_video_id}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}

      {/* Overlay */}
      {slide.overlay_enabled && (
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: slide.overlay_color }}
        />
      )}

      {/* Content Overlay */}
      {(slide.title || slide.description || slide.cta_text) && (
        <div 
          className={cn(
            'absolute inset-0 flex flex-col p-6 z-10',
            getPositionClasses(slide.title_position_h, slide.title_position_v)
          )}
        >
          {slide.title && (
            <h2 
              className={cn(slide.title_font_size, 'mb-2')}
              style={{ 
                fontFamily: slide.title_font_family,
                fontWeight: slide.title_font_weight,
                color: slide.title_color,
              }}
            >
              {slide.title}
            </h2>
          )}
          {slide.description && (
            <p 
              className={cn(slide.description_font_size, 'mb-4 max-w-2xl')}
              style={{ 
                fontFamily: slide.description_font_family,
                fontWeight: slide.description_font_weight,
                color: slide.description_color,
              }}
            >
              {slide.description}
            </p>
          )}
          {slide.cta_text && slide.cta_url && (
            <Button 
              variant={slide.cta_style === 'primary' ? 'default' : slide.cta_style as any}
              asChild
            >
              <a href={slide.cta_url} target={slide.cta_target} rel="noopener noreferrer">
                {slide.cta_text}
              </a>
            </Button>
          )}
        </div>
      )}
    </Wrapper>
  );
};

// Loading skeleton
const SliderSkeleton = () => (
  <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />
);

export default UniversalSlider;
