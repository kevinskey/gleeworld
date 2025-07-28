import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ClockProps {
  className?: string;
}

export const HeaderClock = ({ className = "" }: ClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getChristmasCarolDate = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Christmas Carol performance is typically mid-December
    let christmasCarol = new Date(currentYear, 11, 15); // December 15th
    
    // If we've passed this year's date, use next year
    if (now > christmasCarol) {
      christmasCarol = new Date(currentYear + 1, 11, 15);
    }
    
    return christmasCarol;
  };

  const getCountdownText = () => {
    const now = new Date();
    const christmasCarol = getChristmasCarolDate();
    const diff = christmasCarol.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} days to Christmas Carol`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m to Christmas Carol`;
    } else {
      return `${minutes} minutes to Christmas Carol`;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-900 hover:bg-gray-100/50 transition-all duration-200 relative"
        onMouseEnter={() => setShowCountdown(true)}
        onMouseLeave={() => setShowCountdown(false)}
        onClick={() => setShowCountdown(!showCountdown)}
      >
        <div className="text-center">
          <div className="text-xs font-medium">
            {formatTime(currentTime)}
          </div>
        </div>
      </Button>
      
      {showCountdown && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120]">
          <Badge 
            variant="secondary" 
            className="bg-spelman-blue-dark text-white px-3 py-1 text-xs font-medium shadow-lg animate-fade-in whitespace-nowrap"
          >
            🎄 {getCountdownText()}
          </Badge>
        </div>
      )}
    </div>
  );
};