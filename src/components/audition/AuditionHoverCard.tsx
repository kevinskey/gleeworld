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
      <div className="fixed top-16 left-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
        <Link to={user ? "/auditions" : "/auth?redirect=/auditions"}>
          <Button 
            variant="branded" 
            size="sm"
            className="w-full max-w-xs mx-auto px-6 py-3 rounded-xl text-base touch-manipulation flex items-center justify-center shadow-lg"
          >
            <Mic className="w-4 h-4 mr-2" />
            <span className="truncate">Audition Sign Up</span>
            <span className="ml-2">🎵</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Desktop version with hover card
  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-40">
      <Link to={user ? "/auditions" : "/auth?redirect=/auditions"}>
        <Button 
          variant="branded" 
          size="lg"
          className="px-12 py-6 rounded-full text-xl scale-150 md:scale-125 lg:scale-150"
        >
          <Mic className="w-6 h-6 mr-3 md:w-5 md:h-5 lg:w-6 lg:h-6" />
          Sign Up for Auditions
          <span className="ml-3 md:ml-2 lg:ml-3">🎵</span>
        </Button>
      </Link>
    </div>
  );
};