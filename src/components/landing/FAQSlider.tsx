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
        {/* Header - All screens */}
        <div className="text-center mb-8 md:mb-12 mt-4 md:mt-6 lg:mt-8 relative z-50">
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

        {/* Rotating Question/Answer Cards - All screen sizes */}
        <div>
          {/* Fixed height container for consistent sizing */}
           <div className="h-[320px] md:h-[320px] lg:h-[360px] flex flex-col justify-start space-y-4 max-w-4xl mx-auto">
             {!isFooterCard ? (
               <>
                 {/* Question Card - Smaller */}
                 <div className="bg-background/60 backdrop-blur-sm border border-border rounded-lg p-4 md:p-6 lg:p-8 shadow-sm flex flex-col justify-start">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-primary rounded-full flex items-center justify-center">
                       <span className="text-sm md:text-base lg:text-lg font-bold text-primary-foreground">
                         {String(currentQuestionIndex + 1).padStart(2, '0')}
                       </span>
                     </div>
                     <span className="text-sm md:text-base lg:text-lg text-primary font-medium">QUESTION</span>
                   </div>
                   <p className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-foreground leading-snug transition-all duration-500 ease-in-out" key={currentFAQ?.id + '-q'}>
                     {currentFAQ?.question}
                   </p>
                 </div>
                 
                 {/* Answer Card - Takes remaining space */}
                 <div className="bg-primary/5 backdrop-blur-sm border border-primary/20 rounded-lg p-4 md:p-6 lg:p-8 shadow-sm flex flex-col justify-start flex-1">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-primary/80 rounded-full flex items-center justify-center">
                       <span className="text-sm md:text-base lg:text-lg font-bold text-primary-foreground">A</span>
                     </div>
                     <span className="text-sm md:text-base lg:text-lg text-primary font-medium">ANSWER</span>
                   </div>
                    <p className={cn(
                      "text-muted-foreground leading-relaxed transition-all duration-500 ease-in-out",
                      currentFAQ?.id === "audition-process" ? "text-base md:text-lg lg:text-xl xl:text-2xl" : "text-lg md:text-xl lg:text-2xl xl:text-3xl"
                    )} key={currentFAQ?.id + '-a'}>
                     {currentFAQ?.answer}
                   </p>
                 </div>
               </>
            ) : (
              /* Footer Card in rotation */
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-4 md:p-8 lg:p-10 backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-500 ease-in-out flex flex-col justify-center h-[200px] md:min-h-full">
                <h3 className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground mb-3 md:mb-4 text-center leading-tight">
                  Good luck on your auditions ladies!
                </h3>
                <p className="text-sm md:text-lg lg:text-xl text-primary-foreground/90 mb-1 md:mb-2 text-center">
                  To stay up to date, follow us on social media at
                </p>
                <p className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary-foreground text-center">
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
                  "w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300",
                  index === currentQuestionIndex ? "bg-primary" : "bg-primary/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};