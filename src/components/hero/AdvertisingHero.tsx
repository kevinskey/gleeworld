import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
interface AdvertisingHeroData {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  link_url: string | null;
  link_target: string | null;
}
const ROTATION_INTERVAL = 11000; // 11 seconds

export const AdvertisingHero: React.FC = () => {
  const [heroes, setHeroes] = useState<AdvertisingHeroData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const fetchHeroes = useCallback(async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('advertising_hero').select('*').eq('is_active', true).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setHeroes(data || []);
    } catch (e) {
      console.error('Failed to load advertising heroes:', e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchHeroes();

    // Subscribe to changes
    const channel = supabase.channel('advertising-hero-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'advertising_hero'
    }, () => {
      fetchHeroes();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHeroes]);

  // Auto-rotate
  useEffect(() => {
    if (heroes.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % heroes.length);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [heroes.length, isPaused]);
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % heroes.length);
  }, [heroes.length]);
  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + heroes.length) % heroes.length);
  }, [heroes.length]);
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);
  if (loading) {
    return <div className="w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2/1] bg-muted animate-pulse rounded-xl" />;
  }
  if (heroes.length === 0) {
    return null;
  }
  const hero = heroes[currentIndex];
  const fallbackImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
  const content = <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2/1] rounded-xl overflow-hidden group shadow-lg" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      {/* Hero Images with fade transition */}
      {heroes.map((h, index) => <div key={h.id} className={cn("absolute inset-0 transition-opacity duration-700", index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0")}>
          {/* Desktop Image */}
          <img src={h.image_url || fallbackImage} alt={h.title || 'Featured promotion'} onError={e => {
        if (!e.currentTarget.src.includes('unsplash.com')) {
          e.currentTarget.src = fallbackImage;
        }
      }} className="hidden md:block w-full h-full object-contain" />
          
          {/* iPad/Tablet Image */}
          <img src={h.ipad_image_url || h.image_url || fallbackImage} alt={h.title || 'Featured promotion'} className="hidden sm:block md:hidden w-full h-full object-cover" onError={e => {
        if (!e.currentTarget.src.includes('unsplash.com')) {
          e.currentTarget.src = fallbackImage;
        }
      }} />
          
          {/* Mobile Image */}
          <img src={h.mobile_image_url || h.image_url || fallbackImage} alt={h.title || 'Featured promotion'} className="block sm:hidden w-full h-full object-cover" onError={e => {
        if (!e.currentTarget.src.includes('unsplash.com')) {
          e.currentTarget.src = fallbackImage;
        }
      }} />
        </div>)}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-20 pointer-events-none" />

      {/* Content */}
      {(hero.title || hero.description) && <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white z-30 pointer-events-none">
          {hero.title && <h2 className="text-sm sm:text-lg md:text-2xl font-bold mb-1 sm:mb-2 drop-shadow-lg">
              {hero.title}
            </h2>}
          {hero.description && <p className="text-xs sm:text-sm md:text-base text-white/90 max-w-2xl drop-shadow line-clamp-2">
              {hero.description}
            </p>}
        </div>}

      {/* Link Indicator */}
      {hero.link_url && <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
          <ExternalLink className="w-5 h-5 text-white" />
        </div>}

      {/* Navigation Arrows - only show if multiple heroes */}
      {heroes.length > 1 && <>
          <button onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        goToPrev();
      }} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-1.5 sm:p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous slide">
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
          <button onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        goToNext();
      }} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-1.5 sm:p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next slide">
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-1.5 sm:gap-2">
            {heroes.map((_, index) => <button key={index} onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(index);
        }} className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300", index === currentIndex ? "bg-white scale-110" : "bg-white/50 hover:bg-white/75")} aria-label={`Go to slide ${index + 1}`} />)}
          </div>
        </>}
    </div>;
  if (hero.link_url) {
    return <a href={hero.link_url} target={hero.link_target === 'external' ? '_blank' : '_self'} rel="noopener noreferrer" className="block">
        {content}
      </a>;
  }
  return content;
};