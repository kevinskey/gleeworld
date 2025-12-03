import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
interface ConcertTicketBannerProps {
  showOnMobile?: boolean;
}
export const ConcertTicketBanner = ({
  showOnMobile = false
}: ConcertTicketBannerProps) => {
  return <section className={`w-full ${showOnMobile ? 'block' : 'hidden md:block'}`}>
      <div className="container mx-auto px-4 py-4 md:py-6 my-px">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-[10px] border-none bg-[#ff2b2b] pl-[20px] pr-[20px]">
          <div className="flex items-center gap-3 md:gap-4 text-primary-foreground">
            
            <div className="text-center md:text-left">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight py-0 pt-[10px] text-primary-foreground">
                Christmas Carol Concert Armband Request Here!     
              </h2>
              <p className="text-xs md:text-sm text-accent">Wrist bands are for the Saturday evening performance in Sisters Chapel.
Requests are limited to two per person. Available first come first serve basis. You will be notified by email. Thank you!</p>
            </div>
          </div>
          <Link to="/concert-ticket-request">
            <Button size="sm" variant="secondary" className="hover:scale-105 transition-all duration-300 shadow-sm font-medium text-xs px-2 py-1 whitespace-nowrap bg-primary text-secondary">
              Request Armbands!
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </section>;
};