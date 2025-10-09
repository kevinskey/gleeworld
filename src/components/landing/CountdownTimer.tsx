import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ClockFace = ({ currentTime }: { currentTime: Date }) => {
  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  const secondAngle = (seconds * 6) - 90; // 6 degrees per second
  const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90; // 6 degrees per minute + smooth seconds
  const hourAngle = (hours * 30) + (minutes * 0.5) - 90; // 30 degrees per hour + smooth minutes

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="text-foreground">
      <defs>
        {/* Gradient for 3D effect */}
        <radialGradient id="globeGradient" cx="40%" cy="40%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </radialGradient>
        
        {/* Globe pattern group */}
        <g id="globePattern">
          {/* Longitude lines (vertical curves) */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30);
            return (
              <ellipse
                key={`long-${i}`}
                cx="14"
                cy="14"
                rx={13 * Math.abs(Math.cos(angle * Math.PI / 180))}
                ry="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.3"
                opacity="0.3"
              />
            );
          })}
          
          {/* Latitude lines (horizontal) */}
          {[-8, -4, 0, 4, 8].map((offset) => (
            <ellipse
              key={`lat-${offset}`}
              cx="14"
              cy={14 + offset}
              rx={Math.sqrt(169 - offset * offset)}
              ry={Math.sqrt(169 - offset * offset) * 0.3}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.3"
              opacity="0.3"
            />
          ))}
        </g>
      </defs>
      
      {/* Globe base with gradient */}
      <circle cx="14" cy="14" r="13" fill="url(#globeGradient)"/>
      
      {/* Outer ring */}
      <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      
      {/* Spinning globe pattern */}
      <g className="animate-[spin_60s_linear_infinite]" style={{ transformOrigin: '14px 14px' }}>
        <use href="#globePattern" />
      </g>
      
      {/* Hour markers - stationary */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30) - 90;
        const x1 = 14 + 10.5 * Math.cos(angle * Math.PI / 180);
        const y1 = 14 + 10.5 * Math.sin(angle * Math.PI / 180);
        const x2 = 14 + 12 * Math.cos(angle * Math.PI / 180);
        const y2 = 14 + 12 * Math.sin(angle * Math.PI / 180);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5"/>
        );
      })}
      
      {/* Hour hand - stationary */}
      <line 
        x1="14" y1="14" 
        x2={14 + 7 * Math.cos(hourAngle * Math.PI / 180)} 
        y2={14 + 7 * Math.sin(hourAngle * Math.PI / 180)} 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease-in-out' }}
      />
      
      {/* Minute hand - stationary */}
      <line 
        x1="14" y1="14" 
        x2={14 + 9.5 * Math.cos(minuteAngle * Math.PI / 180)} 
        y2={14 + 9.5 * Math.sin(minuteAngle * Math.PI / 180)} 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease-in-out' }}
      />
      
      {/* Second hand - stationary */}
      <line 
        x1="14" y1="14" 
        x2={14 + 10.5 * Math.cos(secondAngle * Math.PI / 180)} 
        y2={14 + 10.5 * Math.sin(secondAngle * Math.PI / 180)} 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round"
        style={{ transition: 'all 0.1s ease-in-out' }}
      />
      
      {/* Center dot - stationary */}
      <circle cx="14" cy="14" r="1.5" fill="currentColor"/>
    </svg>
  );
};

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Concert date: December 5, 2025 at 7:00 PM
    const concertDate = new Date('2025-12-05T19:00:00');

    const calculateTimeLeft = () => {
      const now = new Date();
      setCurrentTime(now);
      const difference = concertDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-hide popover after 4 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsOpen(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {/* Desktop: Big analog clock separate on header background */}
      <div className="hidden lg:block">
        <ClockFace currentTime={currentTime} />
      </div>
      
      {/* Desktop: Separate digital countdown display */}
      <div className="hidden lg:flex items-center space-x-2 bg-primary/10 rounded-md px-2 py-1 text-xs">
        <Clock className="w-3 h-3 text-primary" />
        <span className="text-primary font-medium">Christmas Carol:</span>
        <div className="flex items-center space-x-1 text-primary font-bold">
          <span>{timeLeft.days}d</span>
          <span>:</span>
          <span>{timeLeft.hours}h</span>
          <span>:</span>
          <span>{timeLeft.minutes}m</span>
          <span>:</span>
          <span>{timeLeft.seconds}s</span>
        </div>
      </div>

      {/* Mobile/Tablet interactive clock */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button 
            className="lg:hidden flex items-center justify-center p-2 transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Current time - tap for Christmas Carol countdown"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <ClockFace currentTime={currentTime} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="bottom" 
          align="center" 
          className="w-auto p-3 animate-fade-in"
          sideOffset={8}
        >
          <div className="text-center">
            <h4 className="font-semibold text-sm text-primary mb-2">Countdown to Christmas Carol</h4>
            <div className="flex items-center justify-center space-x-1 text-primary font-bold text-sm">
              <span>{timeLeft.days}d</span>
              <span>:</span>
              <span>{timeLeft.hours}h</span>
              <span>:</span>
              <span>{timeLeft.minutes}m</span>
              <span>:</span>
              <span>{timeLeft.seconds}s</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};