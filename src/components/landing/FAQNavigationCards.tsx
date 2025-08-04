import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export const FAQNavigationCards = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % faqData.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + faqData.length) % faqData.length);
  };

  const currentFAQ = faqData[currentIndex];

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {faqData.map((faq, index) => (
          <Button
            key={faq.id}
            variant={index === currentIndex ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "text-xs md:text-sm transition-all duration-200",
              index === currentIndex 
                ? "bg-primary text-primary-foreground" 
                : "bg-background/60 hover:bg-background/80"
            )}
          >
            {index + 1}
          </Button>
        ))}
      </div>

      {/* FAQ Card */}
      <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 p-6 md:p-8 min-h-[300px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                {currentIndex + 1}
              </span>
            </div>
            <span className="text-sm font-medium text-primary">QUESTION</span>
          </div>
          
          {/* Navigation Arrows */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 leading-tight">
          {currentFAQ.question}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">A</span>
          </div>
          <span className="text-sm font-medium text-primary">ANSWER</span>
        </div>

        <p className="text-muted-foreground leading-relaxed flex-1">
          {currentFAQ.answer}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center gap-1">
        {faqData.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex ? "bg-primary" : "bg-primary/30"
            )}
          />
        ))}
      </div>
    </div>
  );
};