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
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
        <Link to={user ? "/auditions" : "/auth?redirect=/auditions"}>
          <Button 
            variant="default" 
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-blue-600 active:from-purple-700 active:to-blue-700 text-white shadow-lg border-0 px-4 py-3 rounded-full font-medium text-sm transition-all duration-300 touch-manipulation"
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
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40">
      <Link to={user ? "/auditions" : "/auth?redirect=/auditions"}>
        <Button 
          variant="default" 
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg border-0 px-6 py-3 rounded-full font-medium text-base transition-all duration-300"
        >
          <Mic className="w-5 h-5 mr-2" />
          Sign Up for Auditions
          <span className="ml-2">🎵</span>
        </Button>
      </Link>
    </div>
  );
};