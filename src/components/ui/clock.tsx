import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

interface ClockProps {
  className?: string;
  showSeconds?: boolean;
  format12Hour?: boolean;
}

export const Clock = ({ className = '', showSeconds = false, format12Hour = true }: ClockProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, showSeconds ? 1000 : 60000); // Update every second if showing seconds, otherwise every minute

    return () => clearInterval(timer);
  }, [showSeconds]);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: format12Hour,
    };
    
    return date.toLocaleTimeString('en-US', options);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <EnhancedTooltip content={`Today is ${formatDate(time)}`}>
      <div className={`flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-sm border border-white/50 ${className}`}>
        <ClockIcon className="h-3.5 w-3.5 text-gray-600" />
        <span className="font-mono text-xs sm:text-sm">
          {formatTime(time)}
        </span>
      </div>
    </EnhancedTooltip>
  );
};