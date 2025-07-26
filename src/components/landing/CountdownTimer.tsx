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
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-lg px-4 py-2 mx-auto max-w-md">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-primary">Countdown to Christmas Carol</h3>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{timeLeft.days}</div>
            <div className="text-muted-foreground">Days</div>
          </div>
          <div className="text-primary opacity-60">:</div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{timeLeft.hours}</div>
            <div className="text-muted-foreground">Hours</div>
          </div>
          <div className="text-primary opacity-60">:</div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{timeLeft.minutes}</div>
            <div className="text-muted-foreground">Minutes</div>
          </div>
          <div className="text-primary opacity-60">:</div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{timeLeft.seconds}</div>
            <div className="text-muted-foreground">Seconds</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Dec 5, 2025 • 7:00 PM
        </div>
      </div>
    </div>
  );
};