
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MusicStaffIcon } from "@/components/icons/MusicStaffIcon";

export const AuditionHoverCard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Hide on auditions page to prevent interference
  if (location.pathname === '/auditions' || location.pathname === '/auditioner-dashboard') {
    return null;
  }

  // On mobile, show a compact button fixed to top
  if (isMobile) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="pointer-events-auto">
          <Link to="/auditioner-dashboard">
            <Button 
              variant="default" 
              size="sm"
              className="w-full max-w-sm mx-auto px-4 py-3 h-12 rounded-lg text-sm font-semibold flex items-center justify-center bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 border border-primary/20"
            >
              <span className="mr-2">AUDITION SIGN UP</span>
              <Mic className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Desktop version with hover card
  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-40 pt-[10px] pb-8">
      <Link to="/auditioner-dashboard">
        <Button 
          variant="default" 
          size="lg"
          className="px-12 py-8 rounded-lg text-lg font-bold scale-125 md:scale-100 lg:scale-125 bg-gradient-to-b from-primary via-primary/90 to-primary/80 hover:from-primary/80 hover:via-primary/70 hover:to-primary/60 text-primary-foreground border-2 border-primary shadow-[inset_0_2px_0_rgba(255,255,255,0.2),inset_0_-2px_0_rgba(0,0,0,0.3),0_6px_16px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(0,0,0,0.4),0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out hover:scale-[1.35] md:hover:scale-[1.1] lg:hover:scale-[1.35] animate-fade-in group"
        >
          <Mic className="w-5 h-5 mr-3 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-transform duration-300 group-hover:rotate-12" />
          SIGN UP FOR AUDITIONS
          <MusicStaffIcon className="ml-3 md:ml-2 lg:ml-3 text-primary-foreground" size={20} />
        </Button>
      </Link>
    </div>
  );
};
