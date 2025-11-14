import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

interface CountdownTextProps {
  className?: string;
  targetDate?: Date;
  eventName?: string;
}

export const CountdownText = ({ 
  className = '', 
  targetDate = new Date('2025-12-05T19:00:00'),
  eventName = "Christmas Carol"
}: CountdownTextProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate.getTime()]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <EnhancedTooltip content={`${eventName} - ${formatDate(targetDate)}`}>
      <div className={`hidden md:flex items-center gap-2 text-sm font-medium text-foreground/90 px-3 py-1.5 rounded-lg ${className}`}>
        <Calendar className="h-3.5 w-3.5 text-primary" />
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs">
            {timeLeft.days} {timeLeft.days === 1 ? 'day' : 'days'} to {eventName}
          </span>
        </div>
      </div>
    </EnhancedTooltip>
  );
};
