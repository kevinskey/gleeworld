import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
const DashboardFeaturesCarousel: React.FC = () => {
  const [slides, setSlides] = useState<FeatureSlide[]>([]);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const {
          data
        } = await supabase.from('gw_hero_slides').select('*').eq('usage_context', 'dashboard_features').eq('is_active', true).order('display_order', {
          ascending: true
        });
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
    const t = setTimeout(() => setCurrent(p => (p + 1) % slides.length), dur);
    return () => clearTimeout(t);
  }, [current, slides]);
  const slide = slides[current];
  return <Card className="w-full border-border bg-background/50 backdrop-blur-sm rounded-xl shadow-2xl hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-shadow overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent>
              {slides.length > 0 ? slides.map(s => <CarouselItem key={s.id}>
                    <div className="h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] w-full relative overflow-hidden">
                      {/* Desktop */}
                      <img src={s.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'} alt={s.title || 'Featured promotion'} className="hidden md:block w-full h-full object-cover object-center" onError={e => {
                  if (!e.currentTarget.src.includes('unsplash.com')) {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                  }
                }} />
                      {/* iPad */}
                      <img src={s.ipad_image_url || s.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'} alt={s.title || 'Featured promotion'} className="hidden sm:block md:hidden w-full h-full object-cover object-center" onError={e => {
                  if (!e.currentTarget.src.includes('unsplash.com')) {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                  }
                }} />
                      {/* Mobile */}
                      <img src={s.mobile_image_url || s.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80'} alt={s.title || 'Featured promotion'} className="block sm:hidden w-full h-full object-cover object-center" onError={e => {
                  if (!e.currentTarget.src.includes('unsplash.com')) {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';
                  }
                }} />

                      {/* Overlay content */}
                      {(s.title || s.description) && <div className="absolute inset-0 flex items-end justify-start p-4 md:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <div className="max-w-xl bg-black/60 backdrop-blur-md rounded-lg p-3 sm:p-4 border border-white/30 shadow-2xl text-white space-y-2">
                            {s.title && <h3 className="text-lg md:text-2xl font-bold text-white drop-shadow-lg">{s.title}</h3>}
                            {s.description && <p className="text-xs md:text-sm text-white/95 drop-shadow-md">{s.description}</p>}
                            {s.action_button_enabled && s.action_button_text && s.action_button_url ? <Button size="sm" className="bg-primary text-primary-foreground border border-white/20 shadow" asChild>
                                <a href={s.action_button_url} target="_blank" rel="noopener noreferrer">{s.action_button_text}</a>
                              </Button> : s.button_text && s.link_url ? <Button size="sm" variant="secondary" asChild>
                                <a href={s.link_url} target="_blank" rel="noopener noreferrer">{s.button_text}</a>
                              </Button> : null}
                          </div>
                        </div>}
                    </div>
                  </CarouselItem>) : <CarouselItem>
                  <div className="h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] w-full relative overflow-hidden">
                    {/* Historic street background image */}
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
                  backgroundImage: `url('/lovable-uploads/46a0770f-abdd-41c3-85dc-3c75eaf35e02.png')`
                }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-3 md:space-y-4 max-w-3xl mx-auto px-4 md:px-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 backdrop-blur px-3 py-1.5 text-xs font-medium text-white">
                          <Megaphone className="h-3 w-3 text-white" />
                          Welcome to GleeWorld
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-2xl">
                            Your Musical Journey Starts Here
                          </h3>
                          <p className="text-base md:text-lg text-white/95 max-w-lg mx-auto drop-shadow-lg">
                            Join 100+ years of excellence. Complete your profile and become part of our legacy.
                          </p>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                </CarouselItem>}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </CardContent>
    </Card>;
};

export default DashboardFeaturesCarousel;