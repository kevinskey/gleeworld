import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import WebFont from 'webfontloader';

interface HeroSlide {
  id: string;
  title?: string;
  description?: string;
  image_url: string;
  display_order: number;
}

interface TitleFormatting {
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  color: string;
  marginBottom: number;
  textTransform: string;
  letterSpacing: number;
  fontFamily?: string;
}

export const HeroSlideshow = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [titleFormatting, setTitleFormatting] = useState<TitleFormatting | null>(null);

  useEffect(() => {
    fetchHeroSlides();
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  // Fetch global title formatting and subscribe to realtime changes
  useEffect(() => {
    const fetchFormatting = async () => {
      try {
        const { data, error } = await supabase
          .from('alumnae_global_settings')
          .select('setting_value')
          .eq('setting_key', 'title_formatting')
          .maybeSingle();
        if (error) throw error;
        if (data?.setting_value) {
          setTitleFormatting(data.setting_value as unknown as TitleFormatting);
        }
      } catch (err) {
        console.error('Failed to load hero title formatting:', err);
      }
    };

    fetchFormatting();

    const channelId = `title-formatting-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alumnae_global_settings', filter: 'setting_key=eq.title_formatting' },
        (payload) => {
          console.log('Hero title formatting updated:', payload);
          if ((payload as any).new?.setting_value) {
            setTitleFormatting(((payload as any).new.setting_value) as unknown as TitleFormatting);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load Google font for hero titles
  useEffect(() => {
    if (titleFormatting?.fontFamily) {
      const primary = titleFormatting.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const weight = (titleFormatting.fontWeight || '400').toString().replace(/[^0-9]/g, '') || '400';
      if (primary && primary !== 'inherit') {
        const families = [`${primary}:${weight},400,500,600,700,800,900`];
        WebFont.load({
          google: { families },
          active: () => console.log('✅ Hero font loaded:', families.join(',')),
          inactive: () => console.log('❌ Hero font failed:', families.join(','))
        });
      }
    }
  }, [titleFormatting]);

  const fetchHeroSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_newsletter_hero_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSlides(data || []);
    } catch (error) {
      console.error('Error fetching hero slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (loading) {
    return (
      <div className="w-full h-[500px] md:h-[600px] bg-muted animate-pulse" />
    );
  }

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[currentSlide];

  return (
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden group">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url(${slide.image_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      {/* Content Overlay */}
      {(slide.title || slide.description) && (
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          {slide.title && (
            <h2
              className="mb-2 text-white"
              style={titleFormatting ? {
                fontSize: `${titleFormatting.fontSize}px`,
                fontWeight: titleFormatting.fontWeight,
                textAlign: titleFormatting.textAlign as any,
                color: '#ffffff',
                marginBottom: `${titleFormatting.marginBottom}px`,
                textTransform: titleFormatting.textTransform as any,
                letterSpacing: `${titleFormatting.letterSpacing}px`,
                fontFamily: titleFormatting.fontFamily || 'inherit',
              } : undefined}
            >
              {slide.title}
            </h2>
          )}
          {slide.description && (
            <p className="text-lg opacity-90">{slide.description}</p>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      {slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={nextSlide}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white w-8' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
