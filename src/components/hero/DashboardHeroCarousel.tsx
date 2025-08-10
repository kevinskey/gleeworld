import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Heart, Bell, Sparkles, Megaphone } from 'lucide-react';

// DashboardHeroCarousel: a lightweight hero with slides for authenticated dashboards
// - Uses shadcn/ui Carousel (Embla under the hood)
// - Focused on key member features: Buckets of Love, Wellness, Notifications, Announcements
// - 4:3 aspect on desktop, flexible on mobile

export const DashboardHeroCarousel: React.FC = () => {
  return (
    <section aria-label="Dashboard hero" className="animate-fade-in">
      <Card className="border-border overflow-hidden bg-background/40">
        <CardContent className="p-0">
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {/* Slide 1: Buckets of Love */}
                <CarouselItem>
                  <div className="aspect-[4/3] md:aspect-[16/7] w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/15" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-6 md:px-10 lg:px-14 space-y-3 md:space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs md:text-sm">
                          <Heart className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                          Buckets of Love
                        </div>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight">To Amaze and Inspire</h1>
                        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                          Share encouragement with the Glee community. Send a note of love and support.
                        </p>
                        <div className="pt-1">
                          <Button size="sm" className="hover-scale" onClick={() => {
                            const el = document.querySelector('[data-tab-target="buckets"]') as HTMLElement | null;
                            el?.click();
                            document.getElementById('bol-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}>
                            Send Love
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 2: Wellness */}
                <CarouselItem>
                  <div className="aspect-[4/3] md:aspect-[16/7] w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-background to-emerald-200/40" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-6 md:px-10 lg:px-14 space-y-3 md:space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs md:text-sm">
                          <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-emerald-600" />
                          Wellness
                        </div>
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight">Take a Wellness Minute</h2>
                        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                          Check in, hydrate, and care for your voice. Your well-being powers our sound.
                        </p>
                        <Button variant="secondary" size="sm" className="hover-scale" onClick={() => {
                          const el = document.querySelector('[data-tab-target="wellness"]') as HTMLElement | null;
                          el?.click();
                        }}>
                          Open Wellness
                        </Button>
                      </div>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 3: Notifications */}
                <CarouselItem>
                  <div className="aspect-[4/3] md:aspect-[16/7] w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-100/70 via-background to-amber-200/40" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-6 md:px-10 lg:px-14 space-y-3 md:space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs md:text-sm">
                          <Bell className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                          Notifications
                        </div>
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight">Stay in the Loop</h2>
                        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                          Important updates, tasks, and reminders—organized for your role.
                        </p>
                        <Button variant="outline" size="sm" className="hover-scale" onClick={() => {
                          const el = document.querySelector('[data-tab-target="notifications"]') as HTMLElement | null;
                          el?.click();
                        }}>
                          View Notifications
                        </Button>
                      </div>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 4: Announcements */}
                <CarouselItem>
                  <div className="aspect-[4/3] md:aspect-[16/7] w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-100/70 via-background to-sky-200/40" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-6 md:px-10 lg:px-14 space-y-3 md:space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs md:text-sm">
                          <Megaphone className="h-3 w-3 md:h-4 md:w-4 text-sky-600" />
                          Announcements
                        </div>
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight">What’s New This Week</h2>
                        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                          Rehearsal notes, meetings, and opportunities—all in one place.
                        </p>
                        <Button variant="outline" size="sm" className="hover-scale" onClick={() => {
                          const el = document.querySelector('[data-tab-target="announcements"]') as HTMLElement | null;
                          el?.click();
                        }}>
                          See Announcements
                        </Button>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default DashboardHeroCarousel;
