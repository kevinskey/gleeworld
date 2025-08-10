import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone } from 'lucide-react';

interface FeatureSlide {
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
  action_button_text: string | null;
  action_button_url: string | null;
  action_button_enabled: boolean | null;
  is_active: boolean | null;
}

export const DashboardFeaturesCarousel: React.FC = () => {
  const [slides, setSlides] = useState<FeatureSlide[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const { data } = await supabase
          .from('gw_hero_slides')
          .select('*')
          .eq('usage_context', 'dashboard_features')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        setSlides(data || []);
      } catch (e) {
        console.error('Failed to load features slides', e);
      }
    };
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const dur = (slides[current]?.slide_duration_seconds ?? 10) * 1000;
    const t = setTimeout(() => setCurrent((p) => (p + 1) % slides.length), dur);
    return () => clearTimeout(t);
  }, [current, slides]);

  const slide = slides[current];

  return (
    <Card className="border-border bg-background/50 backdrop-blur-sm rounded-xl shadow-2xl hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-shadow overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Features</CardTitle>
        </div>
        <CardDescription>Sponsored & featured content</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent>
              {slides.length > 0 ? (
                slides.map((s) => (
                  <CarouselItem key={s.id}>
                    <div className="aspect-[4/3] md:aspect-[16/7] w-full relative overflow-hidden">
                      {/* Desktop */}
                      <img
                        src={s.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
                        alt={s.title || 'Featured promotion'}
                        className="hidden md:block w-full h-full object-contain"
                        onError={(e) => {
                          if (!e.currentTarget.src.includes('unsplash.com')) {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                          }
                        }}
                      />
                      {/* iPad */}
                      <img
                        src={s.ipad_image_url || s.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
                        alt={s.title || 'Featured promotion'}
                        className="hidden sm:block md:hidden w-full h-full object-contain"
                        onError={(e) => {
                          if (!e.currentTarget.src.includes('unsplash.com')) {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                          }
                        }}
                      />
                      {/* Mobile */}
                      <img
                        src={s.mobile_image_url || s.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'}
                        alt={s.title || 'Featured promotion'}
                        className="block sm:hidden w-full h-full object-contain"
                        onError={(e) => {
                          if (!e.currentTarget.src.includes('unsplash.com')) {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                          }
                        }}
                      />

                      {/* Overlay content */}
                      {(s.title || s.description) && (
                        <div className="absolute inset-0 flex items-end justify-start p-4 md:p-6 bg-gradient-to-t from-black/60 to-transparent">
                          <div className="max-w-xl bg-background/70 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/10 shadow text-foreground space-y-2">
                            {s.title && <h3 className="text-lg md:text-2xl font-semibold">{s.title}</h3>}
                            {s.description && <p className="text-xs md:text-sm text-muted-foreground">{s.description}</p>}
                            {(s.action_button_enabled && s.action_button_text && s.action_button_url) ? (
                              <Button size="sm" className="bg-primary text-primary-foreground border border-white/20 shadow" asChild>
                                <a href={s.action_button_url} target="_blank" rel="noopener noreferrer">{s.action_button_text}</a>
                              </Button>
                            ) : (s.button_text && s.link_url) ? (
                              <Button size="sm" variant="secondary" asChild>
                                <a href={s.link_url} target="_blank" rel="noopener noreferrer">{s.button_text}</a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="aspect-[4/3] md:aspect-[16/7] w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-6 md:px-10 lg:px-14 space-y-3 md:space-y-4 max-w-2xl bg-background/70 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/10 shadow text-foreground">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 backdrop-blur px-3 py-1 text-xs md:text-sm">
                          <Megaphone className="h-3 w-3 md:h-4 md:w-4" />
                          Featured
                        </div>
                        <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight">Welcome Glee Class of 2029</h3>
                        <p className="text-sm md:text-base text-muted-foreground">You are home. Explore the Glee Club community, resources, and upcoming events.</p>
                        <Button size="sm" className="bg-primary text-primary-foreground border border-white/20 shadow hover:opacity-90" asChild>
                          <a href="/join">Get Started</a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFeaturesCarousel;
