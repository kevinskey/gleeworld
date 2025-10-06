import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface ClockProps {
  className?: string;
}

export const HeaderClock = ({ className = "" }: ClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    // Initialize with current time
    setCurrentTime(new Date());
    
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

  const getHourAngle = () => {
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    return (hours * 30) + (minutes * 0.5); // 30 degrees per hour + minute adjustment
  };

  const getMinuteAngle = () => {
    return currentTime.getMinutes() * 6; // 6 degrees per minute
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className="relative px-2 py-0.5 rounded bg-white/20 backdrop-blur-md border border-spelman-blue-light/30 cursor-pointer hover:bg-white/30 hover:border-spelman-blue-light/50 transition-all duration-300 shadow-sm flex-shrink-0"
          onMouseEnter={() => setShowCountdown(true)}
          onMouseLeave={() => setShowCountdown(false)}
          onClick={() => setShowCountdown(!showCountdown)}
        >
          <span className="text-xs sm:text-sm font-semibold text-gray-800 whitespace-nowrap">
            {formatTime(currentTime)}
          </span>
        </div>
        
        {/* Countdown Text - Visible on large screens, hidden on smaller screens where it becomes hover-only */}
        <div className="hidden xl:block">
          <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
            🎄 {getCountdownText()}
          </span>
        </div>
      </div>
      
      {/* Hover Tooltip for when countdown text is hidden */}
      {showCountdown && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120] xl:hidden">
          <Badge 
            variant="secondary" 
            className="bg-spelman-blue-dark text-white px-3 py-2 text-sm font-medium shadow-xl animate-fade-in whitespace-nowrap border border-white/20"
          >
            🎄 {getCountdownText()}
          </Badge>
          {/* Arrow pointing to clock */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-spelman-blue-dark rotate-45 border-l border-t border-white/20"></div>
        </div>
      )}
    </div>
  );
};