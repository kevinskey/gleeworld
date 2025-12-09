import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import blueBusIcon from "@/assets/blue-bus.png";

interface ClockProps {
  className?: string;
}

export const HeaderClock = ({ className = "" }: ClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCountdown, setShowCountdown] = useState(false);
  const isMobile = useIsMobile();
  const { themeName } = useTheme();
  
  // Theme-specific colors
  const isHbcuTheme = themeName === 'hbcu';
  const isSpelmanBlue = themeName === 'spelman-blue';
  const hbcuGold = '#FFDF00';
  const spelmanWhite = '#ffffff';
  
  const getColor = () => {
    if (isHbcuTheme) return hbcuGold;
    if (isSpelmanBlue) return spelmanWhite;
    return '#1e293b';
  };

  useEffect(() => {
    // Initialize with current time
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getTourDate = () => {
    const now = new Date();
    
    // SCGC Tour 2026: March 8, 2026
    const eventStart = new Date(2026, 2, 8); // March 8, 2026
    const eventEnd = new Date(2026, 2, 15, 23, 59, 59); // Assume week-long tour
    
    return { start: eventStart, end: eventEnd, isHappening: now >= eventStart && now <= eventEnd };
  };

  const getCountdownText = () => {
    const now = new Date();
    const eventInfo = getTourDate();
    
    // Event is currently happening
    if (eventInfo.isHappening) {
      return "SCGC Tour 2026 is happening now! 🎵";
    }
    
    // Event has passed
    if (now > eventInfo.end) {
      return "SCGC Tour 2026 Complete! 🎵";
    }
    
    const diff = eventInfo.start.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} days to SCGC Tour 2026`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m to SCGC Tour 2026`;
    } else if (minutes > 0) {
      return `${minutes} minutes to SCGC Tour 2026`;
    } else {
      return "SCGC Tour 2026 starts soon!";
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

  // Mobile: Circular analog clock with spinning globe
  if (isMobile) {
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const secondAngle = (seconds * 6) - 90;
    const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90;
    const hourAngle = (hours * 30) + (minutes * 0.5) - 90;

    return (
      <div className={`relative ${className}`}>
        <div
          className="relative cursor-pointer"
          onMouseEnter={() => setShowCountdown(true)}
          onMouseLeave={() => setShowCountdown(false)}
          onClick={() => setShowCountdown(!showCountdown)}
        >
          {/* SVG Clock with spinning globe - smaller on mobile */}
          <svg width="28" height="28" viewBox="0 0 40 40" style={{ color: getColor() }}>
            <defs>
              {/* Gradient for 3D effect */}
              <radialGradient id="headerGlobeGradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
              </radialGradient>
              
              {/* Globe pattern group */}
              <g id="headerGlobePattern">
                {/* Longitude lines (vertical curves) */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30);
                  return (
                    <ellipse
                      key={`long-${i}`}
                      cx="20"
                      cy="20"
                      rx={18 * Math.abs(Math.cos(angle * Math.PI / 180))}
                      ry="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.4"
                      opacity="0.2"
                    />
                  );
                })}
                
                {/* Latitude lines (horizontal) */}
                {[-10, -5, 0, 5, 10].map((offset) => (
                  <ellipse
                    key={`lat-${offset}`}
                    cx="20"
                    cy={20 + offset}
                    rx={Math.sqrt(324 - offset * offset)}
                    ry={Math.sqrt(324 - offset * offset) * 0.3}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    opacity="0.2"
                  />
                ))}
              </g>
            </defs>
            
            {/* Globe base with gradient */}
            <circle cx="20" cy="20" r="18" fill="url(#headerGlobeGradient)"/>
            
            {/* Outer ring */}
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30"/>
            
            {/* Spinning globe pattern */}
            <g className="animate-[spin_60s_linear_infinite]" style={{ transformOrigin: '20px 20px' }}>
              <use href="#headerGlobePattern" />
            </g>
            
            {/* Hour markers - stationary */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) - 90;
              const x1 = 20 + 14 * Math.cos(angle * Math.PI / 180);
              const y1 = 20 + 14 * Math.sin(angle * Math.PI / 180);
              const x2 = 20 + 16.5 * Math.cos(angle * Math.PI / 180);
              const y2 = 20 + 16.5 * Math.sin(angle * Math.PI / 180);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2"/>
              );
            })}
            
            {/* Hour hand - stationary */}
            <line 
              x1="20" y1="20" 
              x2={20 + 9 * Math.cos(hourAngle * Math.PI / 180)} 
              y2={20 + 9 * Math.sin(hourAngle * Math.PI / 180)} 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease-in-out' }}
            />
            
            {/* Minute hand - stationary */}
            <line 
              x1="20" y1="20" 
              x2={20 + 13 * Math.cos(minuteAngle * Math.PI / 180)} 
              y2={20 + 13 * Math.sin(minuteAngle * Math.PI / 180)} 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease-in-out' }}
            />
            
            {/* Second hand - stationary */}
            <line 
              x1="20" y1="20" 
              x2={20 + 14 * Math.cos(secondAngle * Math.PI / 180)} 
              y2={20 + 14 * Math.sin(secondAngle * Math.PI / 180)} 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
              style={{ transition: 'all 0.1s ease-in-out' }}
            />
            
            {/* Center dot - stationary */}
            <circle cx="20" cy="20" r="2" fill="currentColor"/>
          </svg>
        </div>
        
        {/* Hover Tooltip with countdown */}
        {showCountdown && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120]">
            <Badge 
              variant="secondary" 
              className="bg-primary text-primary-foreground px-3 py-2 text-sm font-medium shadow-xl animate-fade-in whitespace-nowrap border border-white/20 flex items-center gap-1.5"
            >
              <img src={blueBusIcon} alt="Bus" className="h-4 w-4 object-contain" /> {getCountdownText()}
            </Badge>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-l border-t border-white/20"></div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: Circular analog clock (same as mobile) with countdown
  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const secondAngle = (seconds * 6) - 90;
  const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90;
  const hourAngle = (hours * 30) + (minutes * 0.5) - 90;

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className="relative cursor-pointer"
          onMouseEnter={() => setShowCountdown(true)}
          onMouseLeave={() => setShowCountdown(false)}
          onClick={() => setShowCountdown(!showCountdown)}
        >
          {/* SVG Clock with spinning globe */}
          <svg width="36" height="36" viewBox="0 0 40 40" style={{ color: getColor() }}>
            <defs>
              {/* Gradient for 3D effect */}
              <radialGradient id="desktopGlobeGradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
              </radialGradient>
              
              {/* Globe pattern group */}
              <g id="desktopGlobePattern">
                {/* Longitude lines (vertical curves) */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30);
                  return (
                    <ellipse
                      key={`long-${i}`}
                      cx="20"
                      cy="20"
                      rx={18 * Math.abs(Math.cos(angle * Math.PI / 180))}
                      ry="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.4"
                      opacity="0.2"
                    />
                  );
                })}
                
                {/* Latitude lines (horizontal) */}
                {[-10, -5, 0, 5, 10].map((offset) => (
                  <ellipse
                    key={`lat-${offset}`}
                    cx="20"
                    cy={20 + offset}
                    rx={Math.sqrt(324 - offset * offset)}
                    ry={Math.sqrt(324 - offset * offset) * 0.3}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    opacity="0.2"
                  />
                ))}
              </g>
            </defs>
            
            {/* Globe base with gradient */}
            <circle cx="20" cy="20" r="18" fill="url(#desktopGlobeGradient)"/>
            
            {/* Outer ring */}
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30"/>
            
            {/* Spinning globe pattern */}
            <g className="animate-[spin_60s_linear_infinite]" style={{ transformOrigin: '20px 20px' }}>
              <use href="#desktopGlobePattern" />
            </g>
            
            {/* Hour markers - stationary */}
            {[...Array(12)].map((_, i) => {
              const markerAngle = (i * 30) - 90;
              const x1 = 20 + 14 * Math.cos(markerAngle * Math.PI / 180);
              const y1 = 20 + 14 * Math.sin(markerAngle * Math.PI / 180);
              const x2 = 20 + 16.5 * Math.cos(markerAngle * Math.PI / 180);
              const y2 = 20 + 16.5 * Math.sin(markerAngle * Math.PI / 180);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2"/>
              );
            })}
            
            {/* Hour hand - stationary */}
            <line 
              x1="20" y1="20" 
              x2={20 + 9 * Math.cos(hourAngle * Math.PI / 180)} 
              y2={20 + 9 * Math.sin(hourAngle * Math.PI / 180)} 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease-in-out' }}
            />
            
            {/* Minute hand - stationary */}
            <line 
              x1="20" y1="20" 
              x2={20 + 13 * Math.cos(minuteAngle * Math.PI / 180)} 
              y2={20 + 13 * Math.sin(minuteAngle * Math.PI / 180)} 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease-in-out' }}
            />
            
            {/* Second hand - stationary */}
            <line 
              x1="20" y1="20" 
              x2={20 + 14 * Math.cos(secondAngle * Math.PI / 180)} 
              y2={20 + 14 * Math.sin(secondAngle * Math.PI / 180)} 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
              style={{ transition: 'all 0.1s ease-in-out' }}
            />
            
            {/* Center dot - stationary */}
            <circle cx="20" cy="20" r="2" fill="currentColor"/>
          </svg>
        </div>
        
        {/* Countdown Text - Visible on desktop */}
        <div className="hidden lg:flex items-center gap-1.5">
          <img src={blueBusIcon} alt="Bus" className="h-5 w-5 object-contain" />
          <span className="text-sm font-medium whitespace-nowrap" style={{ color: getColor() }}>
            {getCountdownText()}
          </span>
        </div>
      </div>
      
      {/* Hover Tooltip for when countdown text is hidden */}
      {showCountdown && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[120] lg:hidden">
          <Badge 
            variant="secondary" 
            className="bg-primary text-primary-foreground px-3 py-2 text-sm font-medium shadow-xl animate-fade-in whitespace-nowrap border border-white/20 flex items-center gap-1.5"
          >
            <img src={blueBusIcon} alt="Bus" className="h-4 w-4 object-contain" /> {getCountdownText()}
          </Badge>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-l border-t border-white/20"></div>
        </div>
      )}
    </div>
  );
};