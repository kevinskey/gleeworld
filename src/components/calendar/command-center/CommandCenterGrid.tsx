import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter, ViewMode } from "./CommandCenterCalendar";
import { CommandCenterEventCard } from "./CommandCenterEventCard";

const isSameDayET = (date1: Date, date2: Date): boolean => {
  const tz = 'America/New_York';
  const d1 = toZonedTime(date1, tz);
  const d2 = toZonedTime(date2, tz);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
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

  const getCategoryConfig = (category: CategoryFilter) => {
    return categoryConfigs.find(c => c.id === category);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-[#003366] text-white flex-shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div
            key={idx}
            className="py-2.5 text-center text-sm font-semibold tracking-wide border-r border-[#002244] last:border-r-0"
          >
            {day}
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
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDayET(day, new Date());
          const isSelected = isSameDayET(day, selectedDate);
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "min-h-[100px] p-2 cursor-pointer transition-all border-b border-r border-slate-200 flex flex-col",
                isCurrentMonth ? "bg-white" : "bg-slate-50",
                isToday && "bg-[#B8860B]/10",
                isSelected && "ring-2 ring-inset ring-[#003366] bg-[#003366]/5",
                "hover:bg-slate-50"
              )}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold",
                  !isCurrentMonth && "text-slate-400",
                  isToday && "bg-[#003366] text-white",
                  isSelected && !isToday && "bg-[#B8860B] text-white"
                )}>
                  {format(day, 'd')}
                </span>
                {hasEvents && (
                  <span className="text-xs text-slate-500 font-medium">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

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
                        categoryColor={config?.color || '#708090'}
                        categoryIcon={config?.icon || 'calendar'}
                        compact={viewMode === 'month'}
                        onEventDeleted={onEventDeleted}
                      />
                    );
                  })}
                  {dayEvents.length > (viewMode === 'week' ? 5 : 3) && (
                    <span className="text-xs text-slate-500 font-medium pl-1">
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
