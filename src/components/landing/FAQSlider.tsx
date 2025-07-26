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
            {currentData.icon && (
              <div className="flex justify-center space-x-4 text-primary">
                <Music className="w-8 h-8" />
                <Music className="w-8 h-8" />
              </div>
            )}
            <h1 className="text-2xl md:text-5xl font-bold text-primary">
              {currentData.title}
            </h1>
            <div className="bg-primary/10 rounded-xl p-8 max-w-2xl mx-auto">
              <h2 className="text-lg md:text-3xl font-semibold text-primary">
                {currentData.subtitle}
              </h2>
            </div>
          </div>
        );

      case "qa":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <span className="text-6xl md:text-7xl font-bold text-primary opacity-20">
                FAQ
              </span>
            </div>
            <div className="bg-primary rounded-xl p-6 max-w-4xl mx-auto">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-background rounded-full w-12 h-12 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">Q</span>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white">
                  {currentData.question}
                </h3>
              </div>
            </div>
            <div className="bg-background border-2 border-primary rounded-xl p-6 max-w-4xl mx-auto">
              <div className="flex items-start space-x-4">
                <div className="bg-primary rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white">A</span>
                </div>
                <p className="text-xs md:text-lg text-foreground leading-relaxed">
                  {currentData.answer}
                </p>
              </div>
            </div>
          </div>
        );

      case "closing":
        return (
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-8 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {currentData.title}
              </h2>
              <p className="text-xl text-white/90 mb-4">
                {currentData.subtitle}
              </p>
              <p className="text-2xl font-bold text-white">
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
    <section className="w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b border-primary/20 shadow-lg py-16">
      <div className="container mx-auto px-4">
        <div className="relative">
          {/* Slide Content */}
          <div className="h-[400px] md:h-[450px] flex items-center justify-center">
            {renderSlideContent()}
          </div>

          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-lg"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-lg"
            onClick={nextSlide}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

      </div>
    </section>
  );
};