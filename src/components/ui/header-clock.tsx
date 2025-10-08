import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClockProps {
  className?: string;
}

export const HeaderClock = ({ className = "" }: ClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCountdown, setShowCountdown] = useState(false);
  const isMobile = useIsMobile();

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

  // Mobile: Circular analog clock
  if (isMobile) {
    return (
      <div className={`relative ${className}`}>
        <div
          className="relative cursor-pointer"
          onMouseEnter={() => setShowCountdown(true)}
          onMouseLeave={() => setShowCountdown(false)}
          onClick={() => setShowCountdown(!showCountdown)}
        >
          {/* Circular clock face */}
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border-2 border-primary/30 hover:bg-white/30 hover:border-primary/50 transition-all duration-300 shadow-sm relative">
            {/* Clock center dot */}
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />
            
            {/* Hour hand */}
            <div 
              className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-primary rounded-full origin-bottom transition-transform duration-500"
              style={{ 
                transform: `translate(-50%, -100%) rotate(${getHourAngle()}deg)`,
              }}
            />
            
            {/* Minute hand */}
            <div 
              className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-primary/80 rounded-full origin-bottom transition-transform duration-500"
              style={{ 
                transform: `translate(-50%, -100%) rotate(${getMinuteAngle()}deg)`,
              }}
            />
          </div>
        </div>
        
        {/* Hover Tooltip with countdown */}
        {showCountdown && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120]">
            <Badge 
              variant="secondary" 
              className="bg-primary text-primary-foreground px-3 py-2 text-sm font-medium shadow-xl animate-fade-in whitespace-nowrap border border-white/20"
            >
              🎄 {getCountdownText()}
            </Badge>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-l border-t border-white/20"></div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: Rectangular digital clock
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className="relative px-2 py-0.5 rounded bg-white/20 backdrop-blur-md border border-primary/30 cursor-pointer hover:bg-white/30 hover:border-primary/50 transition-all duration-300 shadow-sm flex-shrink-0"
          onMouseEnter={() => setShowCountdown(true)}
          onMouseLeave={() => setShowCountdown(false)}
          onClick={() => setShowCountdown(!showCountdown)}
        >
          <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
            {formatTime(currentTime)}
          </span>
        </div>
        
        {/* Countdown Text - Visible on large screens */}
        <div className="hidden xl:block">
          <span className="text-sm text-foreground/80 font-medium whitespace-nowrap">
            🎄 {getCountdownText()}
          </span>
        </div>
      </div>
      
      {/* Hover Tooltip for when countdown text is hidden */}
      {showCountdown && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120] xl:hidden">
          <Badge 
            variant="secondary" 
            className="bg-primary text-primary-foreground px-3 py-2 text-sm font-medium shadow-xl animate-fade-in whitespace-nowrap border border-white/20"
          >
            🎄 {getCountdownText()}
          </Badge>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-l border-t border-white/20"></div>
        </div>
      )}
    </div>
  );
};