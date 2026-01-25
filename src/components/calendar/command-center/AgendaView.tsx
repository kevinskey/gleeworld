import { useMemo } from "react";
import { format, addDays, subDays, startOfDay, endOfDay, isAfter, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { CommandCenterEventCard } from "./CommandCenterEventCard";
import { cn } from "@/lib/utils";

const isSameDayET = (date1: Date, date2: Date): boolean => {
  const tz = 'America/New_York';
  const d1 = toZonedTime(date1, tz);
  const d2 = toZonedTime(date2, tz);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

interface AgendaViewProps {
  events: GleeWorldEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onNavigateDay: (direction: 'prev' | 'next') => void;
  getCategoryForEvent: (event: GleeWorldEvent) => CategoryFilter;
  categoryConfigs: CategoryConfig[];
}

export const AgendaView = ({
  events,
  selectedDate,
  onDateSelect,
  onNavigateDay,
  getCategoryForEvent,
  categoryConfigs,
}: AgendaViewProps) => {
  // Get 7 days for the date selector
  const dateSelectorDays = useMemo(() => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(selectedDate, i));
    }
    return days;
  }, [selectedDate]);

  // Events for selected date
  const dayEvents = useMemo(() => {
    return events
      .filter(event => isSameDayET(new Date(event.start_date), selectedDate))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events, selectedDate]);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const startOfTomorrow = startOfDay(addDays(selectedDate, 1));
    const endOfWeek = endOfDay(addDays(selectedDate, 7));
    return events
      .filter(event => {
        const eventDate = new Date(event.start_date);
        return isAfter(eventDate, startOfTomorrow) && isBefore(eventDate, endOfWeek);
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 10);
  }, [events, selectedDate]);

  const getCategoryConfig = (category: CategoryFilter) => {
    return categoryConfigs.find(c => c.id === category);
  };

  const isToday = isSameDayET(selectedDate, new Date());

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Date Header with Swipe Navigation */}
      <div className="bg-[#003366] text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigateDay('prev')}
            className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold">
              {format(selectedDate, 'EEEE')}
            </h2>
            <p className="text-sm text-white/70">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => onNavigateDay('next')}
            className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Date Selector Strip */}
        <div className="flex items-center gap-1 justify-center">
          {dateSelectorDays.map((day) => {
            const isDayToday = isSameDayET(day, new Date());
            const isSelected = isSameDayET(day, selectedDate);
            const dayEvents = events.filter(e => isSameDayET(new Date(e.start_date), day));
            
            return (
              <button
                key={day.toString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-all min-w-[44px]",
                  isSelected 
                    ? "bg-[#B8860B] text-white" 
                    : "bg-white/10 hover:bg-white/20"
                )}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "text-lg font-bold",
                  isDayToday && !isSelected && "text-[#B8860B]"
                )}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((_, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? "bg-white/70" : "bg-[#B8860B]"
                        )} 
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {/* Today's Events */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isToday ? "Today's Schedule" : format(selectedDate, 'EEEE\'s Schedule')}
              <span className="ml-auto text-slate-400 normal-case">
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
              </span>
            </h3>
            {dayEvents.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No events scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map((event) => {
                  const category = getCategoryForEvent(event);
                  const config = getCategoryConfig(category);
                  return (
                    <CommandCenterEventCard
                      key={event.id}
                      event={event}
                      categoryColor={config?.color || '#708090'}
                      categoryIcon={config?.icon || 'calendar'}
                      compact={false}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Coming Up
              </h3>
              <div className="space-y-2">
                {upcomingEvents.map((event) => {
                  const category = getCategoryForEvent(event);
                  const config = getCategoryConfig(category);
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                      <div 
                        className="w-2 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config?.color || '#708090' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(event.start_date), 'EEE, MMM d • h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
