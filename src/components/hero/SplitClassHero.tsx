import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Music, ArrowRight } from 'lucide-react';

export const SplitClassHero: React.FC = () => {
  return (
    <section aria-label="Class hero sections" className="animate-fade-in">
      <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl rounded-lg">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Music Theory Fundamentals - Top on mobile/tablet, Left on desktop */}
            <div className="relative h-[180px] sm:h-[220px] md:h-[260px] lg:h-[320px] group overflow-hidden">
              <a 
                href="/music-theory-fundamentals" 
                className="absolute inset-0 z-10 group-hover:bg-black/10 transition-colors duration-300"
                aria-label="Go to Music Theory Fundamentals"
              >
                <span className="sr-only">Music Theory Fundamentals</span>
              </a>
              
              {/* Background image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-30" />
              </div>
              
              {/* Subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center items-center px-4 sm:px-6 text-center pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 shadow-xl border border-border/50 max-w-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                      Music Fundamentals
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mb-3">
                    Practice sight singing, complete assignments, and build a strong foundation in music theory
                  </p>
                  <Button 
                    size="sm" 
                    className="pointer-events-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                  >
                    Start Learning
                  </Button>
                </div>
              </div>
            </div>

            {/* Music 240 - Bottom on mobile/tablet, Right on desktop */}
            <div className="relative h-[180px] sm:h-[220px] md:h-[260px] lg:h-[320px] group overflow-hidden">
              <a 
                href="/music-240" 
                className="absolute inset-0 z-10 group-hover:bg-black/10 transition-colors duration-300"
                aria-label="Go to Music 240"
              >
                <span className="sr-only">Music 240: Advanced Performance</span>
              </a>
              
              {/* Background image */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-accent/10 to-primary/20">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-30" />
              </div>
              
              {/* Subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center items-center px-4 sm:px-6 text-center pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 shadow-xl border border-border/50 max-w-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Music className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                      Music 240
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mb-3">
                    Survey of African-American Music - explore the rich history and cultural impact of Black musical traditions
                  </p>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="pointer-events-auto shadow-lg flex items-center gap-2"
                  >
                    Enter
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default SplitClassHero;