import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqData = [
  {
    id: "header",
    type: "header",
    title: "Frequently Asked Questions",
    subtitle: "Spelman College Glee Club",
    icon: true,
    imageUrl: "https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/hero-images/hero-desktop-1753412316490.png"
  },
  {
    id: "closing",
    type: "closing",
    title: "Good luck on your auditions ladies!",
    subtitle: "To stay up to date, follow us on social media at",
    handle: "@Spelmanglee"
  }
];

export const FAQSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % faqData.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % faqData.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + faqData.length) % faqData.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const currentData = faqData[currentSlide];

  const renderSlideContent = () => {
    switch (currentData.type) {
      case "header":
        return (
          <div className="text-center space-y-6">
            {currentData.imageUrl ? (
              <div className="relative w-full max-w-4xl mx-auto">
                <img 
                  src={currentData.imageUrl} 
                  alt={currentData.title}
                  className="w-full h-48 md:h-64 object-cover rounded-xl shadow-glass backdrop-blur-sm border border-white/20"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) nextElement.style.display = 'flex';
                  }}
                />
                <div className="hidden flex-col justify-center space-x-4 text-primary">
                  <Music className="w-8 h-8" />
                  <Music className="w-8 h-8" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent rounded-xl flex items-end">
                  <div className="p-6 w-full">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                      {currentData.title}
                    </h1>
                    <h2 className="text-lg md:text-2xl text-white/90">
                      {currentData.subtitle}
                    </h2>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {currentData.icon && (
                  <div className="flex justify-center space-x-4 text-primary">
                    <Music className="w-8 h-8" />
                    <Music className="w-8 h-8" />
                  </div>
                )}
                <h1 className="text-2xl md:text-5xl font-bold text-primary">
                  {currentData.title}
                </h1>
                <div className="bg-primary/10 rounded-xl p-8 max-w-2xl mx-auto backdrop-blur-sm border border-white/20">
                  <h2 className="text-lg md:text-3xl font-semibold text-primary">
                    {currentData.subtitle}
                  </h2>
                </div>
              </>
            )}
          </div>
        );


      case "closing":
        return (
          <div className="text-center space-y-4 md:space-y-8 pt-8 md:pt-4">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 md:p-8 max-w-3xl mx-auto backdrop-blur-sm border border-white/20 shadow-glass">
              <h2 className="text-lg md:text-4xl font-bold text-white mb-2 md:mb-4">
                {currentData.title}
              </h2>
              <p className="text-sm md:text-xl text-white/90 mb-2 md:mb-4">
                {currentData.subtitle}
              </p>
              <p className="text-base md:text-2xl font-bold text-white">
                {currentData.handle}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="w-full relative overflow-hidden py-16">
      {/* Dynamic geometric background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-primary/15"></div>
      
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-primary/15 rounded-full blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 bg-primary/25 rounded-full blur-xl"></div>
      </div>
      
      {/* Border and shadow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div className="container mx-auto px-4">
        <div className="relative">
          {/* Slide Content */}
          <div className="h-[250px] md:h-[500px] flex items-center justify-center">
            {renderSlideContent()}
          </div>

        </div>

      </div>
    </section>
  );
};