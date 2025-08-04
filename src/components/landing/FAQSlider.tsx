import { useState, useEffect } from "react";
import { Music, MessageCircleQuestion } from "lucide-react";
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(faqData[0].id);
  
  // Total items = FAQ questions + 1 footer card
  const totalItems = faqData.length + 1;

  // Auto-rotate questions every 7 seconds (mobile only)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % totalItems);
    }, 7000);

    return () => clearInterval(timer);
  }, [totalItems]);

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestionId(questionId);
  };

  const selectedQuestion = faqData.find(item => item.id === selectedQuestionId);
  const currentFAQ = faqData[currentQuestionIndex];
  const isFooterCard = currentQuestionIndex >= faqData.length;

  return (
    <section className="w-full relative overflow-hidden pt-[96px] pb-20 md:pt-[116px] md:pb-16 lg:pt-[136px] lg:pb-20 min-h-[250px] md:min-h-[350px] fixed top-0 left-0 z-30">

      <div className="container mx-auto px-4 max-w-screen-2xl">
        {/* Header - Desktop only */}
        <div className="hidden md:block text-center mb-16 md:mb-20 mt-8 md:mt-12 lg:mt-16 relative z-50">
          {/* Subtle mask for softening */}
          <div className="absolute inset-0 bg-background/20 backdrop-blur-sm rounded-lg -m-4"></div>
          <div className="relative z-10">
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
        </div>

        {/* Mobile: News ticker header */}
        <div className="md:hidden mb-4">
          <div className="bg-background/40 backdrop-blur-sm border border-border/50 rounded-lg py-3 px-4 overflow-hidden">
            <div className="whitespace-nowrap animate-[marquee_15s_linear_infinite]">
              <span className="text-sm font-semibold text-foreground">
                Frequently Asked Questions • Spelman Glee Club • Frequently Asked Questions • Spelman Glee Club • 
              </span>
            </div>
          </div>
        </div>

        {/* Mobile: Rotating Question/Answer Cards - One at a time */}
        <div className="md:hidden">
          {/* Fixed height container for consistent sizing */}
           <div className="h-[280px] md:h-[320px] flex flex-col justify-start space-y-4">
             {!isFooterCard ? (
               <>
                 {/* Question Card - Smaller */}
                 <div className="bg-background/60 backdrop-blur-sm border border-border rounded-lg p-4 md:p-6 shadow-sm flex flex-col justify-start">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center">
                       <span className="text-sm md:text-base font-bold text-primary-foreground">
                         {String(currentQuestionIndex + 1).padStart(2, '0')}
                       </span>
                     </div>
                     <span className="text-sm md:text-base text-primary font-medium">QUESTION</span>
                   </div>
                   <p className="text-base md:text-lg lg:text-xl font-semibold text-foreground leading-snug transition-all duration-500 ease-in-out" key={currentFAQ?.id + '-q'}>
                     {currentFAQ?.question}
                   </p>
                 </div>
                 
                 {/* Answer Card - Takes remaining space */}
                 <div className="bg-primary/5 backdrop-blur-sm border border-primary/20 rounded-lg p-4 md:p-6 shadow-sm flex flex-col justify-start flex-1">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-primary/80 rounded-full flex items-center justify-center">
                       <span className="text-sm md:text-base font-bold text-primary-foreground">A</span>
                     </div>
                     <span className="text-sm md:text-base text-primary font-medium">ANSWER</span>
                   </div>
                   <p className={cn(
                     "text-muted-foreground leading-relaxed transition-all duration-500 ease-in-out",
                     currentFAQ?.id === "audition-process" ? "text-sm md:text-base" : "text-base md:text-lg"
                   )} key={currentFAQ?.id + '-a'}>
                     {currentFAQ?.answer}
                   </p>
                 </div>
               </>
            ) : (
              /* Footer Card in rotation */
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 md:p-8 backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-500 ease-in-out flex flex-col justify-center min-h-full">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4 text-center leading-tight">
                  Good luck on your auditions ladies!
                </h3>
                <p className="text-base md:text-lg text-primary-foreground/90 mb-2 text-center">
                  To stay up to date, follow us on social media at
                </p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-primary-foreground text-center">
                  @Spelmanglee
                </p>
              </div>
            )}
          </div>
          
          {/* Progress indicator */}
          <div className="flex justify-center space-x-1 pt-4">
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

        {/* iPad & Desktop: Two-Section Layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Section: Questions List */}
            <div className="space-y-3">
              <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Questions</h3>
              {faqData.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleQuestionSelect(item.id)}
                  className={cn(
                    "w-full text-left bg-background/60 backdrop-blur-sm border border-border rounded-lg p-4 lg:p-5 transition-all duration-200 hover:shadow-md hover:bg-primary/5",
                    selectedQuestionId === item.id 
                      ? "ring-2 ring-primary ring-offset-2 bg-primary/5 border-primary/30" 
                      : "hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      selectedQuestionId === item.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-primary/20 text-primary"
                    )}>
                      <span className="text-sm font-bold">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h4 className={cn(
                      "text-sm lg:text-base font-medium leading-snug transition-colors",
                      selectedQuestionId === item.id 
                        ? "text-primary" 
                        : "text-foreground"
                    )}>
                      {item.question}
                    </h4>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Section: Selected Answer */}
            <div className="lg:pl-4">
              <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Answer</h3>
              {selectedQuestion && (
                <div className="bg-primary/5 backdrop-blur-sm border border-primary/20 rounded-lg p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/80 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">A</span>
                    </div>
                    <h4 className="text-base lg:text-lg font-semibold text-foreground">
                      {selectedQuestion.question}
                    </h4>
                  </div>
                  <p className={cn(
                    "text-muted-foreground leading-relaxed",
                    selectedQuestion.id === "audition-process" 
                      ? "text-sm lg:text-base" 
                      : "text-base lg:text-lg"
                  )}>
                    {selectedQuestion.answer}
                  </p>
                </div>
              )}
            </div>
          </div>
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