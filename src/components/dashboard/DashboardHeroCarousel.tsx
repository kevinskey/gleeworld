import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
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
export const DashboardHeroCarousel = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(5000);
  const isMobile = useIsMobile();
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
  const handleSlideClick = (slide: HeroSlide) => {
    if (!slide.link_url) return;
    if (slide.link_target === 'external') {
      window.open(slide.link_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(slide.link_url);
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
    return <Card className="bg-black/30 backdrop-blur-md border-0 shadow-2xl mb-4 rounded-xl">
        <CardContent className="p-3">
          <div className="relative w-full rounded-lg overflow-hidden group">
            <div className={`grid gap-4 w-full ${slidesToShow === 2 ? 'grid-cols-2' : slidesToShow === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {visibleFallback.map((slide, idx) => <div key={`${slide.id}-${idx}`} className="relative w-full h-40 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500" style={{
                backgroundImage: `url(${slide.image_url})`
              }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  </div>

                  {(slide.title || slide.description) && <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                      {slide.title && <h3 className="text-xl sm:text-2xl font-serif font-bold mb-1 sm:mb-2 text-white drop-shadow-lg">{slide.title}</h3>}
                      {slide.description && <p className="text-xs sm:text-sm text-white/95 line-clamp-2 drop-shadow-md">{slide.description}</p>}
                    </div>}
                </div>)}
            </div>
          </div>
        </CardContent>
      </Card>;
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
  return <Card className="bg-black/30 backdrop-blur-md border-0 shadow-2xl mb-4 rounded-xl">
      <CardContent className="p-3 my-0 mx-0 px-[15px] py-[7px]">
        <div className="relative w-full rounded-lg overflow-hidden group mx-0 py-0 px-0 my-0">
          <div className={`grid gap-4 w-full ${slidesToShow === 2 ? 'grid-cols-2' : slidesToShow === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {visibleSlides.map((slide, idx) => <div key={`${slide.id}-${idx}`} className={`relative w-full h-40 rounded-lg overflow-hidden ${slide.link_url ? 'cursor-pointer group' : ''}`} onClick={() => handleSlideClick(slide)}>
                {/* Background Image */}
                <div className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 ${slide.link_url ? 'group-hover:scale-105' : ''}`} style={{
              backgroundImage: `url(${getImageUrl(slide)})`
            }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                </div>

                {/* Content Overlay */}
                {(slide.title || slide.description) && <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 py-[20px] px-[10px]">
                    {slide.title && <h3 className="text-xl sm:text-2xl font-serif font-bold mb-1 sm:mb-2 drop-shadow-lg bg-white/0 text-secondary-foreground">{slide.title}</h3>}
                    {slide.description && <p className="text-xs sm:text-sm text-white/95 line-clamp-2 drop-shadow-md">{slide.description}</p>}
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
      </CardContent>
    </Card>;
};