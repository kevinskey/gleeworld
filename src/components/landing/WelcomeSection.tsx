import { useState, useEffect } from "react";
import { Sparkles, Music, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WelcomeSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative overflow-hidden py-12 md:py-16 lg:py-20">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/60 via-orange-50/40 to-pink-100/60"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 via-transparent to-secondary/15"></div>
      
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-12 w-20 h-20 bg-yellow-300/30 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-32 right-16 w-16 h-16 bg-orange-300/40 rounded-full blur-lg animate-float delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-pink-300/25 rounded-full blur-2xl animate-float delay-2000"></div>
        <div className="absolute bottom-32 right-20 w-18 h-18 bg-primary/20 rounded-full blur-xl animate-float delay-3000"></div>
        
        {/* Musical note decorations */}
        <div className="absolute top-20 left-1/3 opacity-20 animate-float delay-500">
          <Music className="w-8 h-8 text-primary rotate-12" />
        </div>
        <div className="absolute bottom-24 right-1/3 opacity-20 animate-float delay-1500">
          <Music className="w-6 h-6 text-secondary -rotate-12" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn(
          "text-center transition-all duration-1000 ease-out",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Icon cluster */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="flex items-center space-x-2 animate-scale-in">
              <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 animate-pulse" />
              <Heart className="w-8 h-8 md:w-10 md:h-10 text-pink-500" />
              <Star className="w-8 h-8 md:w-10 md:h-10 text-orange-500 animate-pulse delay-300" />
            </div>
          </div>

          {/* Main welcome text */}
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground font-dancing">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Welcome
              </span>
            </h1>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground">
                SCGC
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary">
                  Class of
                </span>
                <span className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 bg-clip-text text-transparent animate-shimmer">
                  2029
                </span>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            Join us in the next chapter of musical excellence at{" "}
            <span className="text-primary font-semibold">Spelman College Glee Club</span>
            . Together, we will create harmony, build sisterhood, and{" "}
            <span className="italic font-medium text-secondary">amaze and inspire</span>
            {" "}through the power of music.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Music className="w-5 h-5 mr-2" />
              Start Your Journey
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Heart className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>

          {/* Bottom decorative elements */}
          <div className="mt-12 flex items-center justify-center space-x-6 opacity-60">
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-primary"></div>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <Music className="w-6 h-6 text-secondary" />
            <Star className="w-6 h-6 text-accent animate-pulse delay-500" />
            <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-primary"></div>
          </div>
        </div>
      </div>
    </section>
  );
};