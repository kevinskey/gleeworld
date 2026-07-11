import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { ProviderAvailability } from "@/hooks/useServiceProviders";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter, ViewMode, CATEGORY_FALLBACK_COLOR } from "./CommandCenterCalendar";
import { CommandCenterEventCard } from "./CommandCenterEventCard";

const isSameDayET = (date1: Date, date2: Date): boolean => {
  const tz = 'America/New_York';
  const d1 = toZonedTime(date1, tz);
  const d2 = toZonedTime(date2, tz);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const formatAvailTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'p' : 'a';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, '0')}${ampm}`;
};

interface CommandCenterGridProps {
  events: GleeWorldEvent[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  viewMode: ViewMode;
  getCategoryForEvent: (event: GleeWorldEvent) => CategoryFilter;
  categoryConfigs: CategoryConfig[];
  onEventDeleted?: () => void;
  providerAvailability?: ProviderAvailability[];
}

export const CommandCenterGrid = ({
  events,
  currentDate,
  selectedDate,
  onDateSelect,
  viewMode,
  getCategoryForEvent,
  categoryConfigs,
  onEventDeleted,
  providerAvailability = [],
}: CommandCenterGridProps) => {
  const days = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, viewMode]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDayET(new Date(event.start_date), date));
  };

  const getAvailabilityForDate = (date: Date) => {
    const tz = 'America/New_York';
    const zonedDate = toZonedTime(date, tz);
    const dayOfWeek = zonedDate.getDay();
    const dateStr = format(zonedDate, 'yyyy-MM-dd');

    return providerAvailability.filter(slot => {
      if (slot.specific_date) {
        return slot.specific_date === dateStr;
      }
      return slot.day_of_week === dayOfWeek;
    }).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getCategoryConfig = (category: CategoryFilter) => {
    return categoryConfigs.find(c => c.id === category);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-white border-b border-slate-200 flex-shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div
            key={idx}
            className={cn(
              "py-2 px-1 text-center text-sm font-semibold tracking-wide overflow-hidden",
              idx === 0 || idx === 6 ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {/* Show full label on roomy screens; abbreviate to 1 letter
                on cramped widths so they never touch each other. */}
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={cn(
        "grid grid-cols-7 flex-1",
        viewMode === 'week' ? "auto-rows-fr" : "auto-rows-fr"
      )}>
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const dayAvailability = getAvailabilityForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDayET(day, new Date());
          const isSelected = isSameDayET(day, selectedDate);
          const hasEvents = dayEvents.length > 0;
          const hasAvailability = dayAvailability.length > 0;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "min-h-[100px] p-1.5 cursor-pointer transition-all border-b border-r border-slate-200 flex flex-col",
                !isCurrentMonth ? "bg-slate-50/80" : isWeekend ? "bg-slate-50" : "bg-white",
                isSelected && "ring-2 ring-inset ring-primary/60",
                "hover:bg-slate-100/60"
              )}
            >
              {/* Date Number — right-aligned like Apple Calendar */}
              <div className="flex items-center justify-end mb-1">
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold tabular-nums",
                  !isCurrentMonth && "text-muted-foreground/60",
                  isCurrentMonth && !isToday && "text-slate-800",
                  isToday && "bg-primary text-primary-foreground font-bold"
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Availability blocks at 50% opacity */}
              {hasAvailability && (
                <div className="flex flex-col gap-0.5 mb-1">
                  {dayAvailability.filter(s => s.is_available).map(slot => (
                    <div
                      key={slot.id}
                      className="rounded px-1 py-0.5 text-xs leading-tight truncate"
                      style={{
                        backgroundColor: 'rgba(6, 182, 212, 0.15)',
                        color: 'rgba(6, 125, 150, 0.7)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                      }}
                    >
                      {formatAvailTime(slot.start_time)}–{formatAvailTime(slot.end_time)}
                    </div>
                  ))}
                </div>
              )}

              {/* Event Cards - Stacked strips */}
              {hasEvents && (
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, viewMode === 'week' ? 5 : 3).map((event) => {
                    const category = getCategoryForEvent(event);
                    const config = getCategoryConfig(category);
                    return (
                      <CommandCenterEventCard
                        key={event.id}
                        event={event}
                        categoryColor={config?.color || CATEGORY_FALLBACK_COLOR}
                        categoryIcon={config?.icon || 'calendar'}
                        compact={viewMode === 'month'}
                        onEventDeleted={onEventDeleted}
                      />
                    );
                  })}
                  {dayEvents.length > (viewMode === 'week' ? 5 : 3) && (
                    <span className="text-xs text-muted-foreground font-medium pl-1">
                      +{dayEvents.length - (viewMode === 'week' ? 5 : 3)} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
