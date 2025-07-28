import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export const AuditionHoverCard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // On mobile, show a compact button that fits viewport
  if (isMobile) {
    return (
      <div className="fixed top-16 left-4 right-4 z-40 max-w-[calc(100vw-2rem)] pt-[10px] h-[812px]">
        <Link to="/auditions">
          <Button 
            variant="branded" 
            size="sm"
            className="w-full max-w-xs mx-auto px-8 py-6 rounded-xl text-base font-semibold touch-manipulation flex items-center justify-center shadow-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 backdrop-blur-xl transition-all duration-500 ease-out hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:border-white/40 animate-fade-in"
          >
            <Mic className="w-4 h-4 mr-3 transition-transform duration-300 group-hover:rotate-12" />
            <span className="truncate">Audition Sign Up</span>
            <span className="ml-3 animate-pulse">🎵</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Desktop version with hover card
  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-40 pt-[10px] pb-8 h-[812px]">
      <Link to="/auditions">
        <Button 
          variant="branded" 
          size="lg"
          className="px-16 py-10 rounded-full text-xl font-bold scale-150 md:scale-125 lg:scale-150 bg-white/10 hover:bg-white/20 text-white shadow-2xl border-2 border-white/20 backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.6] md:hover:scale-[1.35] lg:hover:scale-[1.6] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:border-white/50 animate-fade-in group"
        >
          <Mic className="w-6 h-6 mr-4 md:w-5 md:h-5 lg:w-6 lg:h-6 transition-transform duration-300 group-hover:rotate-12" />
          Sign Up for Auditions
          <span className="ml-4 md:ml-3 lg:ml-4 animate-pulse">🎵</span>
        </Button>
      </Link>
    </div>
  );
};