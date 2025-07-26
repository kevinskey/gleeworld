import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Mic, Calendar, Users } from "lucide-react";
import { Link } from "react-router-dom";

export const AuditionHoverCard = () => {
  return (
    <div className="fixed top-20 md:top-24 left-1/2 transform -translate-x-1/2 z-40">
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button 
            variant="default" 
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg border-0 px-3 py-2 md:px-6 md:py-3 rounded-full font-medium text-sm md:text-base group transition-all duration-300"
          >
            <Mic className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Sign Up for </span>Auditions
            <span className="ml-1 md:ml-2">🎵</span>
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-6 bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Join Spelman Glee Club!</h3>
              <p className="text-gray-600 text-sm">
                Ready to be part of our musical legacy? Sign up for auditions and take the first step toward joining our sisterhood of song.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Share your musical background</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Schedule your audition time</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <Mic className="w-4 h-4 text-pink-600" />
                <span>Take your audition selfie</span>
              </div>
            </div>
            
            <Link to="/auditions" className="block">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold">
                Get Started Now
              </Button>
            </Link>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};