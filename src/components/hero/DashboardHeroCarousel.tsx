import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  button_text: string | null;
  link_url: string | null;
  display_order: number | null;
  slide_duration_seconds: number | null;
  title_position_horizontal: string | null;
  title_position_vertical: string | null;
  description_position_horizontal: string | null;
  description_position_vertical: string | null;
  title_size: string | null;
  description_size: string | null;
  action_button_text: string | null;
  action_button_url: string | null;
  action_button_enabled: boolean | null;
  is_active: boolean | null;
}

// Helpers mirroring landing page behavior
const getHorizontalAlignment = (position: string | null) => {
  switch ((position || 'center').toLowerCase()) {
    case 'left':
      return 'justify-start';
    case 'right':
      return 'justify-end';
    default:
      return 'justify-center';
  }
};

const getVerticalAlignment = (position: string | null) => {
  switch ((position || 'middle').toLowerCase()) {
    case 'top':
      return 'items-start';
    case 'bottom':
      return 'items-end';
    default:
      return 'items-center';
  }
};

const getTitleSize = (size: string | null) => {
  switch ((size || 'large').toLowerCase()) {
    case 'small':
      return 'text-[10px] sm:text-xs';
    case 'medium':
      return 'text-xs sm:text-sm';
    default:
      return 'text-sm sm:text-base';
  }
};

const getDescriptionSize = (size: string | null) => {
  switch ((size || 'medium').toLowerCase()) {
    case 'small':
      return 'text-sm sm:text-base';
    case 'large':
      return 'text-lg sm:text-xl';
    default:
      return 'text-base sm:text-lg';
  }
};

// DashboardHeroCarousel - uses the same hero slides as the landing page (usage_context = 'homepage')
export const DashboardHeroCarousel: React.FC = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const { data } = await supabase
          .from('gw_hero_slides')
          .select('*')
          .eq('usage_context', 'homepage')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        setHeroSlides(data || []);
      } catch (e) {
        console.error('Failed to load dashboard hero slides', e);
      }
    };
    fetchSlides();
  }, []);

  // Auto-advance like landing
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const active = heroSlides[currentSlide];
    const ms = ((active?.slide_duration_seconds ?? 10) as number) * 1000;
    const t = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, ms);
    return () => clearTimeout(t);
  }, [currentSlide, heroSlides]);

  const slide = heroSlides[currentSlide];

  return (
    <section aria-label="Dashboard hero" className="animate-fade-in">
      <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl rounded-lg">
        <CardContent className="p-0">
          <div className="h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] relative overflow-hidden">
            {slide ? (
              <>
                {/* Desktop */}
                <img
                  src={slide.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
                  alt={slide.title || 'GleeWorld hero image'}
                  className="hidden md:block w-full h-full object-contain transition-opacity duration-500"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('unsplash.com')) {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                    }
                  }}
                />
                {/* iPad */}
                <img
                  src={slide.ipad_image_url || slide.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
                  alt={slide.title || 'GleeWorld hero image'}
                  className="hidden sm:block md:hidden w-full h-full object-contain transition-opacity duration-500"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('unsplash.com')) {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                    }
                  }}
                />
                {/* Mobile */}
                <img
                  src={slide.mobile_image_url || slide.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
                  alt={slide.title || 'GleeWorld hero image'}
                  className="block sm:hidden w-full h-full object-contain transition-opacity duration-500"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('unsplash.com')) {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                    }
                  }}
                />

                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />

                {/* Title overlay */}
                {slide.title && (
                  <div
                    className={`absolute inset-0 flex ${getVerticalAlignment(slide.title_position_vertical)} ${getHorizontalAlignment(slide.title_position_horizontal)} px-4 sm:px-6 md:px-8 lg:px-12 pointer-events-none`}
                  >
                    <div className="bg-foreground/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 shadow-xl border border-background/20 pointer-events-auto">
                      <h4 className={`${getTitleSize(slide.title_size)} font-bold text-background drop-shadow-lg`}>{slide.title}</h4>
                    </div>
                  </div>
                )}

                {/* Description overlay */}
                {slide.description && (
                  <div
                    className={`absolute inset-0 flex ${getVerticalAlignment(slide.description_position_vertical)} ${getHorizontalAlignment(slide.description_position_horizontal)} px-4 sm:px-6 md:px-8 lg:px-12 pointer-events-none`}
                  >
                    <div className="bg-foreground/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 shadow-xl border border-background/20 pointer-events-auto max-w-2xl">
                      <p className={`${getDescriptionSize(slide.description_size)} text-background drop-shadow-md`}>{slide.description}</p>
                    </div>
                  </div>
                )}

                {/* Action button (mirrors landing) */}
                {slide.action_button_enabled && slide.action_button_text && slide.action_button_url && (
                  <div className="absolute inset-0 flex justify-center items-end pb-4 sm:pb-6 md:pb-8 px-4 pointer-events-none">
                    <Button size="sm" className="pointer-events-auto bg-primary text-primary-foreground border border-background/20 shadow-xl">
                      <a href={slide.action_button_url} target="_blank" rel="noopener noreferrer">
                        {slide.action_button_text}
                      </a>
                    </Button>
                  </div>
                )}
                {!slide.action_button_enabled && slide.button_text && slide.link_url && (
                  <div className="absolute inset-0 flex justify-center items-end pb-4 sm:pb-6 md:pb-8 px-4 pointer-events-none">
                    <Button size="sm" className="pointer-events-auto bg-primary text-primary-foreground border border-white/20 shadow-xl">
                      <a href={slide.link_url} target="_blank" rel="noopener noreferrer">
                        {slide.button_text}
                      </a>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No hero slides configured</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default DashboardHeroCarousel;
