import React, { useMemo } from 'react';
import { Bus, MapPin, Navigation } from 'lucide-react';
import { differenceInHours, differenceInMinutes, isAfter, isBefore, parseISO, isValid } from 'date-fns';

interface TourCity {
  id: string;
  city_name: string;
  state_code: string;
  arrival_date: string;
  departure_date: string | null;
  city_order: number;
}

interface BusTripAnimationProps {
  cities: TourCity[];
  tourStartDate: string;
  tourEndDate: string;
}

export const BusTripAnimation: React.FC<BusTripAnimationProps> = ({ cities, tourStartDate, tourEndDate }) => {
  const sortedCities = useMemo(() => 
    [...cities].sort((a, b) => a.city_order - b.city_order),
    [cities]
  );

  const tripState = useMemo(() => {
    if (sortedCities.length < 2) return null;

    const now = new Date();
    const tourStart = parseISO(tourStartDate + 'T00:00:00');
    const tourEnd = parseISO(tourEndDate + 'T23:59:59');

    if (!isValid(tourStart) || !isValid(tourEnd)) return null;

    // Before tour starts
    if (isBefore(now, tourStart)) {
      const hoursUntil = differenceInHours(tourStart, now);
      const minsUntil = differenceInMinutes(tourStart, now) % 60;
      return {
        status: 'pre-tour' as const,
        fromCity: sortedCities[0],
        toCity: sortedCities[1],
        progress: 0,
        timeLabel: hoursUntil > 24 
          ? `${Math.floor(hoursUntil / 24)}d ${hoursUntil % 24}h to departure`
          : `${hoursUntil}h ${minsUntil}m to departure`,
        currentCityIndex: 0,
      };
    }

    // After tour ends
    if (isAfter(now, tourEnd)) {
      return {
        status: 'completed' as const,
        fromCity: sortedCities[sortedCities.length - 2],
        toCity: sortedCities[sortedCities.length - 1],
        progress: 100,
        timeLabel: 'Tour Complete',
        currentCityIndex: sortedCities.length - 1,
      };
    }

    // During tour — find current segment
    for (let i = 0; i < sortedCities.length - 1; i++) {
      const current = sortedCities[i];
      const next = sortedCities[i + 1];
      const departDate = current.departure_date || current.arrival_date;
      const arriveDate = next.arrival_date;

      const depart = parseISO(departDate + 'T08:00:00');
      const arrive = parseISO(arriveDate + 'T18:00:00');

      if ((isBefore(now, arrive) || i === sortedCities.length - 2)) {
        const totalMs = arrive.getTime() - depart.getTime();
        const elapsedMs = now.getTime() - depart.getTime();
        const segProgress = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

        const remainingMins = Math.max(0, differenceInMinutes(arrive, now));
        const remainingHrs = Math.floor(remainingMins / 60);
        const remainingM = remainingMins % 60;

        // Calculate overall tour progress
        const overallProgress = ((i + segProgress / 100) / (sortedCities.length - 1)) * 100;

        return {
          status: 'in-transit' as const,
          fromCity: current,
          toCity: next,
          progress: overallProgress,
          segmentProgress: segProgress,
          fromLabel: `From ${current.city_name}`,
          timeLabel: remainingMins <= 0 
            ? 'Arriving now' 
            : remainingHrs > 0 
              ? `${remainingHrs}h ${remainingM}m to ${next.city_name}`
              : `${remainingM}m to ${next.city_name}`,
          currentCityIndex: i,
        };
      }
    }

    return null;
  }, [sortedCities, tourStartDate, tourEndDate]);

  if (!tripState || sortedCities.length < 2) return null;

  const busPosition = Math.min(Math.max(tripState.progress, 2), 95);

  return (
    <div className="relative bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--primary)/0.05)] backdrop-blur-sm rounded-xl p-4 border border-primary/20 overflow-hidden">
      {/* Subtle animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-24 h-24 rounded-full bg-primary/10 blur-2xl"
          style={{
            left: `${busPosition}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'left 2s ease-in-out',
          }}
        />
      </div>

      {/* Status label */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bus className="h-4 w-4 text-primary" />
            {tripState.status === 'in-transit' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            {tripState.status === 'pre-tour' ? 'Upcoming' : tripState.status === 'completed' ? 'Completed' : 'En Route'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1">
          <Navigation className="h-3 w-3 text-primary" />
          <span className="text-xs font-bold text-primary">{tripState.timeLabel}</span>
        </div>
      </div>

      {/* Route visualization */}
      <div className="relative z-10 px-1">
        {/* City labels - from and to */}
        <div className="flex justify-between items-end mb-2">
          <div className="text-left max-w-[40%]">
            <p className="text-[10px] text-foreground/50 uppercase tracking-wide">From</p>
            <p className="text-xs font-bold text-foreground truncate">
              {sortedCities[0].city_name}
            </p>
          </div>
          <div className="text-right max-w-[40%]">
            <p className="text-[10px] text-foreground/50 uppercase tracking-wide">To</p>
            <p className="text-xs font-bold text-foreground truncate">
              {sortedCities[sortedCities.length - 1].city_name}
            </p>
          </div>
        </div>

        {/* Track */}
        <div className="relative h-8 flex items-center">
          {/* Background track */}
          <div className="absolute inset-x-0 h-1 bg-muted/60 rounded-full top-1/2 -translate-y-1/2" />
          
          {/* Progress track */}
          <div 
            className="absolute left-0 h-1 bg-gradient-to-r from-primary to-primary/70 rounded-full top-1/2 -translate-y-1/2 transition-all duration-[2s] ease-in-out"
            style={{ width: `${busPosition}%` }}
          />

          {/* City dots */}
          {sortedCities.map((city, idx) => {
            const position = sortedCities.length > 1 
              ? (idx / (sortedCities.length - 1)) * 100 
              : 0;
            const isPassed = position <= tripState.progress;
            
            return (
              <div
                key={city.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `${position}%` }}
              >
                <div className={`w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500 ${
                  isPassed 
                    ? 'bg-primary border-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]' 
                    : 'bg-background border-muted-foreground/30'
                }`} />
                {/* City label for intermediate stops */}
                {idx > 0 && idx < sortedCities.length - 1 && (
                  <span className={`absolute top-4 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-medium ${
                    isPassed ? 'text-primary' : 'text-foreground/40'
                  }`}>
                    {city.city_name}
                  </span>
                )}
              </div>
            );
          })}

          {/* Animated Bus */}
          <div
            className="absolute top-1/2 -translate-x-1/2 z-20 transition-all duration-[2s] ease-in-out"
            style={{ 
              left: `${busPosition}%`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            <div className="relative">
              {/* Bus glow */}
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-md scale-150" />
              {/* Bus icon container */}
              <div className="relative w-7 h-7 rounded-full bg-primary shadow-lg flex items-center justify-center border-2 border-primary-foreground/30">
                <Bus className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              {/* Motion lines when in transit */}
              {tripState.status === 'in-transit' && (
                <>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-2 h-[1px] bg-primary/40 animate-pulse" />
                  <div className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-2 w-1.5 h-[1px] bg-primary/30 animate-pulse delay-75" />
                  <div className="absolute left-0 top-2/3 -translate-y-1/2 -translate-x-2.5 w-1.5 h-[1px] bg-primary/30 animate-pulse delay-150" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
