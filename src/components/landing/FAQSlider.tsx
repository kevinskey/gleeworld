import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqData = [
  {
    id: "header",
    type: "header",
    title: "Frequently Asked Questions",
    subtitle: "Spelman College Glee Club",
    icon: true
  },
  {
    id: "audition-required",
    type: "qa",
    question: "Is an audition required to join the Glee Club?",
    answer: "Yes! In order to join the Glee Club, you must audition and will be notified of your acceptance before the first rehearsal."
  },
  {
    id: "audition-process",
    type: "qa",
    question: "What happens at a Glee Club Audition?",
    answer: "We ask you to prepare thirty seconds to a minute of any song that best showcases your voice. In addition, we'll ask you to attempt a Glee song that will be provided to you in advance. Lastly, we will test your sight-reading ability to gauge your existing musical knowledge. Sight-reading is not required to be a member of the Glee Club."
  },
  {
    id: "music-genre",
    type: "qa",
    question: "What genre of music does the glee club sing?",
    answer: "The Glee Club repertoire consists of sacred and secular choral literature for women's voices, with a particular focus on traditional spirituals, music by African American composers and music from many cultures."
  },
  {
    id: "rehearsal-schedule",
    type: "qa",
    question: "How often does the Glee Club rehearse?",
    answer: "The Glee Club rehearses every Monday, Wednesday, and Friday from 5:00 P.M. to about 6:30 P.M."
  },
  {
    id: "performance-frequency",
    type: "qa",
    question: "How often does the Glee Club perform?",
    answer: "The Glee Club performs on campus and in the Atlanta area throughout the entire year, as well as a tour of multiple states during spring break."
  },
  {
    id: "class-credit",
    type: "qa",
    question: "Is the Glee club considered a class?",
    answer: "Yes. The Glee Club is considered a class and each member must be registered for 1 or 0 credits."
  },
  {
    id: "music-major",
    type: "qa",
    question: "Do I have to be a music major to join glee?",
    answer: "No! The Glee Club accepts members from various of majors and disciplines."
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
            <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-xl p-6 md:p-8 max-w-4xl mx-auto backdrop-blur-sm border border-white/20 shadow-glass">
              {currentData.icon && (
                <div className="flex justify-center space-x-4 text-white mb-4 md:mb-6">
                  <Music className="w-8 h-8 md:w-12 md:h-12" />
                  <Music className="w-8 h-8 md:w-12 md:h-12" />
                </div>
              )}
              <h1 className="text-2xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-6">
                {currentData.title}
              </h1>
              <h2 className="text-lg md:text-3xl lg:text-4xl text-white/90 font-medium">
                {currentData.subtitle}
              </h2>
            </div>
          </div>
        );

      case "qa":
        return (
          <div className="space-y-4 md:space-y-8">
            <div className="bg-primary rounded-xl p-2 md:p-6 lg:p-8 max-w-4xl mx-auto backdrop-blur-sm border border-white/20 min-h-[60px] md:min-h-[100px] lg:min-h-[120px] flex items-center">
              <div className="flex items-center space-x-2 md:space-x-6 lg:space-x-8 w-full">
                <div className="bg-background rounded-full w-8 h-8 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm md:text-2xl lg:text-3xl font-bold text-primary">Q</span>
                </div>
                <h3 className="text-sm md:text-3xl lg:text-4xl font-semibold text-white">
                  {currentData.question}
                </h3>
              </div>
            </div>
            <div className="bg-background border-2 border-primary rounded-xl p-2 md:p-6 lg:p-8 max-w-4xl mx-auto backdrop-blur-sm border border-white/20 min-h-[100px] md:min-h-[140px] lg:min-h-[160px] flex items-start">
              <div className="flex items-start space-x-2 md:space-x-6 lg:space-x-8 w-full">
                <div className="bg-primary rounded-full w-8 h-8 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm md:text-2xl lg:text-3xl font-bold text-white">A</span>
                </div>
                <p className="text-xs md:text-xl lg:text-2xl text-foreground leading-relaxed">
                  {currentData.answer}
                </p>
              </div>
            </div>
          </div>
        );

      case "closing":
        return (
          <div className="text-center space-y-4 md:space-y-8">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 md:p-8 max-w-3xl mx-auto backdrop-blur-sm border border-white/20 shadow-glass">
              <h2 className="text-lg md:text-5xl lg:text-6xl font-bold text-white mb-2 md:mb-6">
                {currentData.title}
              </h2>
              <p className="text-sm md:text-2xl lg:text-3xl text-white/90 mb-2 md:mb-6">
                {currentData.subtitle}
              </p>
              <p className="text-base md:text-3xl lg:text-4xl font-bold text-white">
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
    <section className="w-full relative overflow-hidden pt-24 md:pt-32 lg:pt-40 pb-24">
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
          {/* Fixed FAQ Letters - Always visible for Q&A slides */}
          {currentData.type === "qa" && (
            <div className="absolute top-4 md:top-8 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
              <span className="text-4xl md:text-7xl font-bold text-primary opacity-20">
                FAQ
              </span>
            </div>
          )}
          
          {/* Slide Content - Fixed height container with consistent top margin */}
          <div className="h-[300px] md:h-[500px] lg:h-[600px] flex items-start justify-center pt-8 md:pt-16 lg:pt-20">
            {renderSlideContent()}
          </div>
        </div>
      </div>
    </section>
  );
};