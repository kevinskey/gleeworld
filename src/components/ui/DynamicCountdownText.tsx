import { useActiveHeaderCountdown } from '@/hooks/useCountdowns';
import { CountdownText } from './countdown-text';

interface DynamicCountdownTextProps {
  className?: string;
  fallbackEventName?: string;
  fallbackDate?: Date;
}

export const DynamicCountdownText = ({ 
  className,
  fallbackEventName = "Upcoming Event",
  fallbackDate,
}: DynamicCountdownTextProps) => {
  const { data: activeCountdown, isLoading } = useActiveHeaderCountdown();

  if (isLoading) {
    return null;
  }

  // If there's an active countdown from the database, use it
  if (activeCountdown) {
    return (
      <CountdownText
        className={className}
        targetDate={new Date(activeCountdown.target_date)}
        eventName={activeCountdown.event_name}
      />
    );
  }

  // If no active countdown and no fallback date, don't render
  if (!fallbackDate) {
    return null;
  }

  // Use fallback values
  return (
    <CountdownText
      className={className}
      targetDate={fallbackDate}
      eventName={fallbackEventName}
    />
  );
};
