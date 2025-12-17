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

  // Get the two slides to display
  const slide1 = heroSlides[currentSlide];
  const slide2 = heroSlides[(currentSlide + 1) % heroSlides.length];

  const renderSlide = (slideData: HeroSlide | undefined, index: number) => {
    if (!slideData) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No hero slides configured</p>
        </div>
      );
    }

    return (
      <div className="h-[200px] sm:h-[240px] md:h-[280px] lg:h-[320px] relative overflow-hidden">
        {/* Desktop */}
        <img
          src={slideData.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
          alt={slideData.title || 'GleeWorld hero image'}
          className="hidden md:block w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            if (!e.currentTarget.src.includes('unsplash.com')) {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
            }
          }}
        />
        {/* iPad */}
        <img
          src={slideData.ipad_image_url || slideData.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
          alt={slideData.title || 'GleeWorld hero image'}
          className="hidden sm:block md:hidden w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            if (!e.currentTarget.src.includes('unsplash.com')) {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
            }
          }}
        />
        {/* Mobile */}
        <img
          src={slideData.mobile_image_url || slideData.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
          alt={slideData.title || 'GleeWorld hero image'}
          className="block sm:hidden w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            if (!e.currentTarget.src.includes('unsplash.com')) {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
            }
          }}
        />

        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />

        {/* Title overlay */}
        {slideData.title && (
          <div
            className={`absolute inset-0 flex ${getVerticalAlignment(slideData.title_position_vertical)} ${getHorizontalAlignment(slideData.title_position_horizontal)} px-3 sm:px-4 pointer-events-none`}
          >
            <div className="bg-foreground/60 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-xl border border-background/20 pointer-events-auto">
              <h4 className={`${getTitleSize(slideData.title_size)} font-bold text-background drop-shadow-lg`}>{slideData.title}</h4>
            </div>
          </div>
        )}

        {/* Action button */}
        {slideData.action_button_enabled && slideData.action_button_text && slideData.action_button_url && (
          <div className="absolute inset-0 flex justify-center items-end pb-3 sm:pb-4 px-3 pointer-events-none">
            <Button size="sm" className="pointer-events-auto bg-primary text-primary-foreground border border-background/20 shadow-xl text-xs">
              <a href={slideData.action_button_url} target="_blank" rel="noopener noreferrer">
                {slideData.action_button_text}
              </a>
            </Button>
          </div>
        )}
        {!slideData.action_button_enabled && slideData.button_text && slideData.link_url && (
          <div className="absolute inset-0 flex justify-center items-end pb-3 sm:pb-4 px-3 pointer-events-none">
            <Button size="sm" className="pointer-events-auto bg-primary text-primary-foreground border border-white/20 shadow-xl text-xs">
              <a href={slideData.link_url} target="_blank" rel="noopener noreferrer">
                {slideData.button_text}
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section aria-label="Dashboard hero" className="animate-fade-in">
      <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl rounded-lg">
        <div className="px-4 pt-3 pb-2">
          <h4 className="text-xs sm:text-sm font-semibold tracking-wide uppercase text-foreground">Glee Cam</h4>
        </div>
        <CardContent className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="rounded-lg overflow-hidden">
              {renderSlide(slide1, 0)}
            </div>
            {heroSlides.length > 1 && (
              <div className="rounded-lg overflow-hidden">
                {renderSlide(slide2, 1)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default DashboardHeroCarousel;
