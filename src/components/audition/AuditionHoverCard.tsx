import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MusicStaffIcon } from "@/components/icons/MusicStaffIcon";

export const AuditionHoverCard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // On mobile, show a compact button that fits viewport
  if (isMobile) {
    return (
      <div className="fixed top-[74px] left-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
        <Link to="/auditions">
          <Button 
            variant="branded" 
            size="sm"
            className="w-full max-w-xs mx-auto px-6 py-4 h-14 rounded-lg text-sm font-bold touch-manipulation flex items-center justify-center bg-gradient-to-b from-spelman-blue-light via-spelman-blue-light/90 to-spelman-blue-dark hover:from-spelman-blue-light/80 hover:via-spelman-blue-light/70 hover:to-spelman-blue-dark/90 text-white border-2 border-spelman-blue-light shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.4),0_6px_12px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out hover:scale-105 animate-fade-in mb-[10px]"
          >
            <span className="truncate text-sm mr-3 tracking-widest">AUDITION SIGN UP</span>
            <Mic className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
          </Button>
        </Link>
      </div>
    );
  }

  // Desktop version with hover card
  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-40 pt-[10px] pb-8">
      <Link to="/auditions">
        <Button 
          variant="branded" 
          size="lg"
          className="px-12 py-8 rounded-lg text-lg font-bold scale-125 md:scale-100 lg:scale-125 bg-gradient-to-b from-spelman-blue-light via-spelman-blue-light/90 to-spelman-blue-dark hover:from-spelman-blue-light/80 hover:via-spelman-blue-light/70 hover:to-spelman-blue-dark/90 text-white border-2 border-spelman-blue-light shadow-[inset_0_2px_0_rgba(255,255,255,0.2),inset_0_-2px_0_rgba(0,0,0,0.3),0_6px_16px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(0,0,0,0.4),0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out hover:scale-[1.35] md:hover:scale-[1.1] lg:hover:scale-[1.35] animate-fade-in group"
        >
          <Mic className="w-5 h-5 mr-3 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-transform duration-300 group-hover:rotate-12" />
          SIGN UP FOR AUDITIONS
          <MusicStaffIcon className="ml-3 md:ml-2 lg:ml-3 text-white" size={20} />
        </Button>
      </Link>
    </div>
  );
};