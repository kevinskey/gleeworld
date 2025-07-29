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
            className="w-full max-w-xs mx-auto px-6 py-4 rounded-xl text-sm font-semibold touch-manipulation flex items-center justify-center shadow-2xl bg-gradient-to-r from-purple-600/30 via-purple-500/40 via-pink-500/40 to-purple-600/30 hover:from-purple-500/40 hover:via-purple-400/50 hover:via-pink-400/50 hover:to-purple-500/40 text-white border border-white/30 backdrop-blur-xl transition-all duration-500 ease-out hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:border-purple-300/50 animate-fade-in overflow-hidden"
          >
            <Mic className="w-3 h-3 mr-2 transition-transform duration-300 group-hover:rotate-12" />
            <span className="truncate">Audition Sign Up</span>
            <span className="ml-2 animate-pulse">🎵</span>
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
          className="px-12 py-8 rounded-full text-lg font-bold scale-125 md:scale-100 lg:scale-125 bg-gradient-to-r from-purple-600/30 via-purple-500/40 via-pink-500/40 to-purple-600/30 hover:from-purple-500/40 hover:via-purple-400/50 hover:via-pink-400/50 hover:to-purple-500/40 text-white shadow-2xl border border-purple-300/30 backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.35] md:hover:scale-[1.1] lg:hover:scale-[1.35] hover:shadow-[0_0_40px_rgba(147,51,234,0.5)] hover:border-purple-300/50 animate-fade-in group overflow-hidden"
        >
          <Mic className="w-5 h-5 mr-3 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-transform duration-300 group-hover:rotate-12" />
          Sign Up for Auditions
          <span className="ml-3 md:ml-2 lg:ml-3 animate-pulse">🎵</span>
        </Button>
      </Link>
    </div>
  );
};