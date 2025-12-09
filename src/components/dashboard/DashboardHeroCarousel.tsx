import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(5000);
  const [expandedSlide, setExpandedSlide] = useState<HeroSlide | null>(null);
  const isMobile = useIsMobile();
  const { themeName } = useTheme();
  
  // HBCU theme colors
  const isHbcuTheme = themeName === 'hbcu';
  const hbcuGold = '#FFDF00';
  const hbcuRed = '#8B0000';

  useEffect(() => {
    fetchHeroSlides();
    fetchScrollSettings();
  }, []);
  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, scrollSpeed);
      return () => clearInterval(timer);
    }
  }, [slides.length, scrollSpeed]);
  const fetchScrollSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('dashboard_hero_settings').select('scroll_speed_seconds, auto_scroll_enabled').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.auto_scroll_enabled) {
        setScrollSpeed(data.scroll_speed_seconds * 1000); // Convert to milliseconds
      }
    } catch (error) {
      console.error('Error fetching scroll settings:', error);
    }
  };
  const fetchHeroSlides = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('dashboard_hero_slides').select('*').eq('is_active', true).order('display_order', {
        ascending: true
      });
      if (error) throw error;
      setSlides(data || []);
      console.log('DashboardHeroCarousel: slides fetched', {
        count: (data || []).length,
        sample: (data || []).slice(0, 3)
      });
    } catch (error) {
      console.error('Error fetching dashboard hero slides:', error);
    } finally {
      setLoading(false);
      console.log('DashboardHeroCarousel: loading complete');
    }
  };
  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  // Determine which image to use based on screen size
  const getImageUrl = (slide: HeroSlide) => {
    const width = window.innerWidth;

    // Mobile: 1 image
    if (width < 768) {
      return slide.mobile_image_url || slide.image_url;
    }

    // iPad: 2 images (we'll handle this with grid)
    if (width >= 768 && width < 1024) {
      return slide.ipad_image_url || slide.image_url;
    }

    // Desktop: 3 images
    return slide.image_url;
  };

  // Calculate how many slides to show
  const getSlidesToShow = () => {
    const width = window.innerWidth;
    if (width < 768) return 2;
    if (width >= 768 && width < 1024) return 3;
    return 4;
  };
  const handleSlideClick = (slide: HeroSlide, e: React.MouseEvent) => {
    // If it's a link, navigate; otherwise expand the image
    if (slide.link_url) {
      if (slide.link_target === 'external') {
        window.open(slide.link_url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(slide.link_url);
      }
    } else {
      // Expand the image
      setExpandedSlide(slide);
    }
  };
  const slidesToShow = getSlidesToShow();
  if (loading) {
    return <div className="w-full h-80 bg-muted animate-pulse rounded-lg" />;
  }
  if (slides.length === 0) {
    // Fallback: show sample slides from public images so the section is always visible
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
    const visibleFallback = fallbackSlides.slice(0, slidesToShow);
    return <div className="mb-4 rounded-xl border-2 border-slate-400/50 dark:border-slate-500 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800 shadow-lg p-3">
          <div className="relative w-full rounded-lg overflow-hidden group">
            <div className={`grid gap-4 w-full ${slidesToShow === 2 ? 'grid-cols-2' : slidesToShow === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {visibleFallback.map((slide, idx) => <div 
                key={`${slide.id}-${idx}`} 
                className="relative w-full h-40 rounded-lg overflow-hidden hero-carousel-bg"
                style={{
                  backgroundImage: `url(${slide.image_url})`
                }}
              >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

                  {(slide.title || slide.description) && <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      {slide.title && <h3 
                        className="text-sm sm:text-base font-serif font-bold mb-0.5 drop-shadow-lg line-clamp-1"
                        style={{ color: isHbcuTheme ? hbcuGold : '#ffffff' }}
                      >{slide.title}</h3>}
                      {slide.description && <p 
                        className="text-[10px] sm:text-xs line-clamp-1 drop-shadow-md"
                        style={{ color: isHbcuTheme ? hbcuGold : 'rgba(255,255,255,0.95)', opacity: isHbcuTheme ? 0.9 : 1 }}
                      >{slide.description}</p>}
                    </div>}
                </div>)}
            </div>
          </div>
        </div>;
  }

  // Get visible slides for the carousel
  const getVisibleSlides = () => {
    const visible = [];
    for (let i = 0; i < slidesToShow; i++) {
      visible.push(slides[(currentSlide + i) % slides.length]);
    }
    return visible;
  };
  const visibleSlides = getVisibleSlides();
  return <div 
    className={`mb-4 rounded-xl border-2 shadow-lg p-3 ${className || ''}`}
    style={{
      borderColor: isHbcuTheme ? hbcuRed : undefined,
      background: isHbcuTheme ? 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)' : undefined
    }}
  >
        <div className="relative w-full rounded-lg overflow-hidden group">
          <div className={`grid gap-4 w-full ${slidesToShow === 2 ? 'grid-cols-2' : slidesToShow === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {visibleSlides.map((slide, idx) => <div 
              key={`${slide.id}-${idx}`} 
              className={`relative w-full h-40 rounded-lg overflow-hidden hero-carousel-bg cursor-pointer ${slide.link_url ? 'group' : ''}`}
              onClick={(e) => handleSlideClick(slide, e)}
              style={{
                backgroundImage: `url(${getImageUrl(slide)})`
              }}
            >
                <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent transition-all duration-500 ${slide.link_url ? 'group-hover:scale-105' : ''}`} />

                {/* Content Overlay */}
                {(slide.title || slide.description) && <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    {slide.title && <h3 
                      className="text-sm sm:text-base font-serif font-bold mb-0.5 drop-shadow-lg line-clamp-1"
                      style={{ color: isHbcuTheme ? hbcuGold : '#ffffff' }}
                    >{slide.title}</h3>}
                    {slide.description && <p 
                      className="text-[10px] sm:text-xs line-clamp-1 drop-shadow-md"
                      style={{ color: isHbcuTheme ? hbcuGold : 'rgba(255,255,255,0.95)', opacity: isHbcuTheme ? 0.9 : 1 }}
                    >{slide.description}</p>}
                  </div>}
              </div>)}
          </div>

          {/* Navigation Buttons - Only show if more slides than visible */}
          {slides.length > slidesToShow && <>
              <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={prevSlide}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={nextSlide}>
                <ChevronRight className="h-6 w-6" />
              </Button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, index) => <button key={index} onClick={() => setCurrentSlide(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'}`} aria-label={`Go to slide ${index + 1}`} />)}
              </div>
            </>}
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
                <h3 className="text-white text-lg md:text-xl font-bold">{expandedSlide.title}</h3>
                {expandedSlide.description && (
                  <p className="text-white/90 text-sm md:text-base mt-1">{expandedSlide.description}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};