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
      
    </section>;
};