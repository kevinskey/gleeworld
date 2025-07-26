import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Concert date: December 5, 2025 at 7:00 PM
    const concertDate = new Date('2025-12-05T19:00:00');

    const calculateTimeLeft = () => {
      const now = new Date();
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

  return (
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
  );
};