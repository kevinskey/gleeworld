import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Camera } from 'lucide-react';

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

// DashboardHeroCarousel - uses the same hero slides as the landing page (usage_context = 'homepage')
export const DashboardHeroCarousel: React.FC = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchSlides();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-[85%] sm:w-[70%] md:w-[48%] aspect-video bg-muted animate-pulse rounded-xl border border-border" />
          <div className="flex-shrink-0 w-[85%] sm:w-[70%] md:w-[48%] aspect-video bg-muted animate-pulse rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  if (heroSlides.length === 0) {
    return null;
  }

  // Hero slide thumbnail component
  const HeroSlideThumbnail = ({ slide }: { slide: HeroSlide }) => {
    return (
      <div className="relative w-full aspect-video group cursor-pointer flex-shrink-0 rounded-lg overflow-hidden">
        {/* Desktop */}
        <img
          src={slide.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
          alt={slide.title || 'GleeWorld hero image'}
          className="hidden md:block w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          className="hidden sm:block md:hidden w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          className="block sm:hidden w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (!e.currentTarget.src.includes('unsplash.com')) {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
            }
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/20 transition-colors duration-300" />

        {/* Title overlay - Bottom */}
        {slide.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent p-2 sm:p-3 z-10">
            <h3 className={`${getTitleSize(slide.title_size)} font-bold text-background drop-shadow-lg truncate`}>
              {slide.title}
            </h3>
          </div>
        )}

        {/* Action button */}
        {slide.action_button_enabled && slide.action_button_text && slide.action_button_url && (
          <div className="absolute top-2 right-2 z-10">
            <Button size="sm" className="bg-primary text-primary-foreground border border-background/20 shadow-xl text-xs">
              <a href={slide.action_button_url} target="_blank" rel="noopener noreferrer">
                {slide.action_button_text}
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section aria-label="Dashboard hero" className="animate-fade-in w-full">
      <div className="relative p-3 sm:p-4 bg-card/50 backdrop-blur-sm border border-border rounded-xl shadow-sm">
        
        {/* Header */}
        <div className="relative mb-3 sm:mb-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
          </h2>
          {heroSlides.length > 1 && (
            <span className="text-xs text-muted-foreground">
              Swipe to browse
            </span>
          )}
        </div>
        
        {/* Horizontal Scroll Carousel */}
        <div className="relative -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-hidden">
          <div 
            className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {heroSlides.map((slide) => (
              <div 
                key={slide.id} 
                className="flex-none w-[280px] sm:w-[320px] md:w-[400px] lg:w-[450px] snap-start"
              >
                <HeroSlideThumbnail slide={slide} />
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicators (dots) */}
        {heroSlides.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {heroSlides.map((slide) => (
              <div 
                key={slide.id}
                className="w-2 h-2 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardHeroCarousel;
