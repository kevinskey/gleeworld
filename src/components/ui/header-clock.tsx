import { useState, useEffect } from "react";
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
      <div
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-md border border-spelman-blue-light/30 cursor-pointer hover:bg-white/30 hover:border-spelman-blue-light/50 transition-all duration-300 hover:scale-105 shadow-md flex-shrink-0"
        onMouseEnter={() => setShowCountdown(true)}
        onMouseLeave={() => setShowCountdown(false)}
        onClick={() => setShowCountdown(!showCountdown)}
      >
        {/* Clock Face */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10">
          {/* Hour Markers */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-1.5 bg-gray-700 rounded-full"
              style={{
                top: '2px',
                left: '50%',
                transformOrigin: '50% 16px',
                transform: `translateX(-50%) rotate(${i * 30}deg)`,
              }}
            />
          ))}
          
          {/* Hour Hand */}
          <div
            className="absolute top-1/2 left-1/2 w-0.5 bg-gray-800 rounded-full origin-bottom z-10"
            style={{
              height: '9px',
              transform: `translate(-50%, -100%) rotate(${getHourAngle()}deg)`,
            }}
          />
          
          {/* Minute Hand */}
          <div
            className="absolute top-1/2 left-1/2 w-0.5 bg-gray-700 rounded-full origin-bottom z-20"
            style={{
              height: '14px',
              transform: `translate(-50%, -100%) rotate(${getMinuteAngle()}deg)`,
            }}
          />
          
          {/* Center Dot */}
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-spelman-blue-dark rounded-full transform -translate-x-1/2 -translate-y-1/2 z-30" />
        </div>
      </div>
      
      {/* Countdown Tooltip */}
      {showCountdown && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120]">
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