import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import useEmblaCarousel from 'embla-carousel-react';

interface HeroSlide {
  id: string;
  title?: string;
  description?: string;
  image_url: string;
  mobile_image_url?: string;
  ipad_image_url?: string;
  display_order: number;
  link_url?: string;
  link_target?: string;
}

interface DashboardHeroCarouselProps {
  className?: string;
}

export const DashboardHeroCarousel = ({ className }: DashboardHeroCarouselProps) => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlide, setExpandedSlide] = useState<HeroSlide | null>(null);
  const isMobile = useIsMobile();
  const { themeName } = useTheme();
  
  // Embla carousel with swipe support on all devices
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    dragFree: true,
    skipSnaps: false,
    watchDrag: true,
    containScroll: 'trimSnaps'
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Reinitialize embla when slides load
  useEffect(() => {
    if (emblaApi && slides.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, slides]);
  
  // HBCU theme colors
  const isHbcuTheme = themeName === 'hbcu';
  const hbcuGold = '#FFDF00';
  const hbcuRed = '#8B0000';

  useEffect(() => {
    fetchHeroSlides();
  }, []);

  const fetchHeroSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_hero_slides')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setSlides(data || []);
    } catch (error) {
      console.error('Error fetching dashboard hero slides:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine which image to use based on screen size
  const getImageUrl = (slide: HeroSlide) => {
    const width = window.innerWidth;
    if (width < 768) {
      return slide.mobile_image_url || slide.image_url;
    }
    if (width >= 768 && width < 1024) {
      return slide.ipad_image_url || slide.image_url;
    }
    return slide.image_url;
  };

  const handleSlideClick = (slide: HeroSlide, e: React.MouseEvent) => {
    if (slide.link_url) {
      if (slide.link_target === 'external') {
        window.open(slide.link_url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(slide.link_url);
      }
    } else {
      setExpandedSlide(slide);
    }
  };

  if (loading) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm">
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-40 sm:w-48 h-32 bg-muted animate-pulse rounded-lg" />
            <div className="flex-shrink-0 w-40 sm:w-48 h-32 bg-muted animate-pulse rounded-lg" />
            <div className="flex-shrink-0 w-40 sm:w-48 h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (slides.length === 0) {
    const fallbackSlides: HeroSlide[] = [{
      id: 'fallback-1',
      title: 'Spelman Glee Club — Live in Concert',
      description: 'To Amaze and Inspire.',
      image_url: '/images/hero-glee-1.jpg',
      display_order: 1
    }, {
      id: 'fallback-2',
      title: 'Christmas at Spelman',
      description: 'A season of joy and tradition.',
      image_url: '/images/hero-glee-2.jpg',
      display_order: 2
    }, {
      id: 'fallback-3',
      title: 'Carols and Classics',
      description: 'Harmony, heritage, and hope.',
      image_url: '/images/hero-glee-3.jpg',
      display_order: 3
    }];

    return (
      <Card className="bg-background/95 backdrop-blur-sm">
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
            <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">
              member moments
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-3">
              {fallbackSlides.map((slide) => (
                <SlideItem 
                  key={slide.id} 
                  slide={slide} 
                  getImageUrl={getImageUrl}
                  isHbcuTheme={isHbcuTheme}
                  hbcuGold={hbcuGold}
                  onClick={handleSlideClick}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-background/95 backdrop-blur-sm ${className || ''}`}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
            <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">
              member moments
            </span>
          </CardTitle>
          {slides.length > 3 && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={scrollPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={scrollNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
          <div className="flex gap-3">
            {slides.map((slide) => (
              <SlideItem 
                key={slide.id} 
                slide={slide} 
                getImageUrl={getImageUrl}
                isHbcuTheme={isHbcuTheme}
                hbcuGold={hbcuGold}
                onClick={handleSlideClick}
              />
            ))}
          </div>
        </div>

        {/* Expanded Image Modal */}
        <Dialog open={!!expandedSlide} onOpenChange={(open) => !open && setExpandedSlide(null)}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none w-full max-w-[100vw] md:max-w-[85vw] lg:max-w-[70vw]">
            <div className="relative w-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={() => setExpandedSlide(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              {expandedSlide && (
                <img
                  src={getImageUrl(expandedSlide)}
                  alt={expandedSlide.title || 'Hero image'}
                  className="w-full h-auto rounded-lg object-contain max-h-[90vh]"
                />
              )}
              {expandedSlide?.title && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
                  <h4 className="text-white text-lg md:text-xl font-bold">{expandedSlide.title}</h4>
                  {expandedSlide.description && (
                    <p className="text-white/90 text-sm md:text-base mt-1">{expandedSlide.description}</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Extracted slide component for cleaner code
const SlideItem = ({ 
  slide, 
  getImageUrl, 
  isHbcuTheme, 
  hbcuGold, 
  onClick 
}: { 
  slide: HeroSlide; 
  getImageUrl: (slide: HeroSlide) => string;
  isHbcuTheme: boolean;
  hbcuGold: string;
  onClick: (slide: HeroSlide, e: React.MouseEvent) => void;
}) => (
  <div 
    className="flex-shrink-0 w-40 sm:w-48 md:w-56 relative h-32 sm:h-36 rounded-lg overflow-hidden cursor-pointer group"
    onClick={(e) => onClick(slide, e)}
  >
    <img 
      src={getImageUrl(slide)} 
      alt={slide.title || 'Glee Cam'} 
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
    {(slide.title || slide.description) && (
      <div className="absolute bottom-0 left-0 right-0 p-2">
        {slide.title && (
          <h3 
            className="text-xs sm:text-sm font-serif font-bold mb-0.5 drop-shadow-lg line-clamp-1"
            style={{ color: isHbcuTheme ? hbcuGold : '#ffffff' }}
          >
            {slide.title}
          </h3>
        )}
        {slide.description && (
          <p 
            className="text-[9px] sm:text-[10px] line-clamp-1 drop-shadow-md"
            style={{ color: isHbcuTheme ? hbcuGold : 'rgba(255,255,255,0.95)', opacity: isHbcuTheme ? 0.9 : 1 }}
          >
            {slide.description}
          </p>
        )}
      </div>
    )}
  </div>
);