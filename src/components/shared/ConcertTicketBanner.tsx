import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
interface ConcertTicketBannerProps {
  showOnMobile?: boolean;
}
export const ConcertTicketBanner = ({
  showOnMobile = false
}: ConcertTicketBannerProps) => {
  return <section className={`w-full bg-gradient-to-r from-primary via-primary/95 to-accent ${showOnMobile ? 'block' : 'hidden md:block'}`}>
      <div className="container mx-auto px-4 py-4 md:py-6 my-[10px] bg-[#751925]/0 text-black/[0.01]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-[10px] bg-primary-foreground">
          <div className="flex items-center gap-3 md:gap-4 text-primary-foreground">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-3 text-secondary">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 bg-accent text-accent" />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight py-0">
                Christmas Carol Concert Armband Request Here!     
              </h2>
              <p className="text-xs md:text-sm text-accent">Wrist bands are for Saturday evening performance in Sisters Chapel.
Requests are limited to two per person. Available first come first serve basis. You will be notified by email the status of your request. Thank you</p>
            </div>
          </div>
          <Link to="/concert-ticket-request">
            <Button size="default" variant="secondary" className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-lg font-semibold text-sm md:text-base px-4 md:px-6 py-2 md:py-3 whitespace-nowrap">
              Request Armbands!
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>;
};