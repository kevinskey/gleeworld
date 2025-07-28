import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export const AuditionHoverCard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // On mobile, just show a direct link button
  if (isMobile) {
    return (
      <div className="fixed top-[6.5rem] left-1/2 transform -translate-x-1/2 z-40 pb-4">
        <Link to={user ? "/auditions" : "/auth?redirect=/auditions"}>
          <Button 
            variant="branded" 
            size="sm"
            className="px-4 py-3 rounded-full text-sm touch-manipulation"
          >
            <Mic className="w-4 h-4 mr-2" />
            Sign Up for Auditions
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
          size="sm"
          className="px-6 py-3 rounded-full text-base"
        >
          <Mic className="w-5 h-5 mr-2" />
          Sign Up for Auditions
          <span className="ml-2">🎵</span>
        </Button>
      </Link>
    </div>
  );
};