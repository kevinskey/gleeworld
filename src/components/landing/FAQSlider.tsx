import { useState, useEffect } from "react";
import { ChevronDown, Music, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const faqData = [
  {
    id: "audition-required",
    question: "Is an audition required to join the Glee Club?",
    answer: "Yes! In order to join the Glee Club, you must audition and will be notified of your acceptance before the first rehearsal."
  },
  {
    id: "audition-process",
    question: "What happens at a Glee Club Audition?",
    answer: "We ask you to prepare thirty seconds to a minute of any song that best showcases your voice. In addition, we'll ask you to attempt a Glee song that will be provided to you in advance. Lastly, we will test your sight-reading ability to gauge your existing musical knowledge. Sight-reading is not required to be a member of the Glee Club."
  },
  {
    id: "music-genre",
    question: "What genre of music does the glee club sing?",
    answer: "The Glee Club repertoire consists of sacred and secular choral literature for women's voices, with a particular focus on traditional spirituals, music by African American composers and music from many cultures."
  },
  {
    id: "rehearsal-schedule",
    question: "How often does the Glee Club rehearse?",
    answer: "The Glee Club rehearses every Monday, Wednesday, and Friday from 5:00 P.M. to about 6:30 P.M."
  },
  {
    id: "performance-frequency",
    question: "How often does the Glee Club perform?",
    answer: "The Glee Club performs on campus and in the Atlanta area throughout the entire year, as well as a tour of multiple states during spring break."
  },
  {
    id: "class-credit",
    question: "Is the Glee club considered a class?",
    answer: "Yes. The Glee Club is considered a class and each member must be registered for 1 or 0 credits."
  },
  {
    id: "music-major",
    question: "Do I have to be a music major to join glee?",
    answer: "No! The Glee Club accepts members from various of majors and disciplines."
  }
];

export const FAQSlider = () => {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Total items = FAQ questions + 1 footer card
  const totalItems = faqData.length + 1;

  // Auto-rotate questions every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % totalItems);
    }, 7000);

    return () => clearInterval(timer);
  }, [totalItems]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const isOpen = (id: string) => openItems.includes(id);

  const currentFAQ = faqData[currentQuestionIndex];
  const isFooterCard = currentQuestionIndex >= faqData.length;

  return (
    <section className="w-full relative overflow-hidden pt-24 pb-12 md:pt-32 md:pb-16 lg:pt-40 lg:pb-20 min-h-[600px] md:min-h-[800px]">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/3 to-primary/8"></div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-primary/15 rounded-full blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 bg-primary/25 rounded-full blur-xl"></div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header - Desktop only */}
        <div className="hidden md:block text-center mb-16 md:mb-20">
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <Music className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <MessageCircleQuestion className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Spelman College Glee Club
          </p>
        </div>

        {/* Mobile: Thin stationary header */}
        <div className="md:hidden text-center mb-4">
          <div className="bg-background/40 backdrop-blur-sm border border-border/50 rounded-lg py-2 px-4">
            <h2 className="text-sm font-semibold text-foreground leading-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Spelman College Glee Club
            </p>
          </div>
        </div>

        {/* Mobile: Rotating Question/Answer Cards */}
        <div className="md:hidden space-y-3">
          {!isFooterCard ? (
            <>
              {/* Question Card */}
              <div className="bg-background/60 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">
                      {String(currentQuestionIndex + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-xs text-primary font-medium">QUESTION</span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug transition-all duration-500 ease-in-out" key={currentFAQ?.id + '-q'}>
                  {currentFAQ?.question}
                </p>
              </div>
              
              {/* Answer Card */}
              <div className="bg-primary/5 backdrop-blur-sm border border-primary/20 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">A</span>
                  </div>
                  <span className="text-xs text-primary font-medium">ANSWER</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed transition-all duration-500 ease-in-out" key={currentFAQ?.id + '-a'}>
                  {currentFAQ?.answer}
                </p>
              </div>
            </>
          ) : (
            /* Footer Card in rotation */
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-500 ease-in-out">
              <h3 className="text-xl font-bold text-primary-foreground mb-3 text-center">
                Good luck on your auditions ladies!
              </h3>
              <p className="text-sm text-primary-foreground/90 mb-2 text-center">
                To stay up to date, follow us on social media at
              </p>
              <p className="text-lg font-bold text-primary-foreground text-center">
                @Spelmanglee
              </p>
            </div>
          )}
          
          {/* Progress indicator */}
          <div className="flex justify-center space-x-1 pt-2">
            {Array.from({length: totalItems}).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentQuestionIndex ? "bg-primary" : "bg-primary/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Desktop: Original Accordion */}
        <div className="hidden md:block space-y-4">
          {faqData.map((item, index) => (
            <div
              key={item.id}
              className="bg-background/60 backdrop-blur-sm border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-6 py-5 md:px-8 md:py-6 text-left flex items-center justify-between transition-colors duration-200 hover:bg-primary/5"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm md:text-base font-bold text-primary-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg lg:text-xl font-semibold text-foreground pr-4">
                    {item.question}
                  </h3>
                </div>
                <ChevronDown 
                  className={cn(
                    "w-5 h-5 md:w-6 md:h-6 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                    isOpen(item.id) && "rotate-180"
                  )}
                />
              </button>
              
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isOpen(item.id) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="px-6 pb-6 md:px-8 md:pb-8">
                  <div className="pl-12 md:pl-14">
                    <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA - Desktop only */}
        <div className="hidden md:block text-center mt-16 md:mt-20">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 md:p-8 backdrop-blur-sm border border-white/20 shadow-lg">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground mb-3">
              Good luck on your auditions ladies!
            </h3>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-2">
              To stay up to date, follow us on social media at
            </p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-primary-foreground">
              @Spelmanglee
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};