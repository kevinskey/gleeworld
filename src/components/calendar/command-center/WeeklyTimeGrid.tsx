import { useMemo, useRef, useEffect, useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { EventDetailDialog } from "../EventDetailDialog";
import { EditEventDialog } from "../EditEventDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const isSameDayET = (date1: Date, date2: Date): boolean => {
  const tz = 'America/New_York';
  const d1 = toZonedTime(date1, tz);
  const d2 = toZonedTime(date2, tz);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM
const HOUR_HEIGHT = 64; // px per hour

// Get contrast color for text on colored background
const getContrastTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a2e' : '#ffffff';
};

interface WeeklyTimeGridProps {
  events: GleeWorldEvent[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  getCategoryForEvent: (event: GleeWorldEvent) => CategoryFilter;
  categoryConfigs: CategoryConfig[];
  onEventDeleted?: () => void;
}

interface PositionedEvent {
  event: GleeWorldEvent;
  top: number;
  height: number;
  category: CategoryFilter;
  color: string;
}

export const WeeklyTimeGrid = ({
  events,
  currentDate,
  selectedDate,
  onDateSelect,
  getCategoryForEvent,
  categoryConfigs,
  onEventDeleted,
}: WeeklyTimeGridProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GleeWorldEvent | null>(null);
  const [userPermissions, setUserPermissions] = useState<{isAdmin: boolean} | null>(null);

  useEffect(() => {
    const fetchPerms = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, role')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setUserPermissions({
          isAdmin: data.is_admin || data.is_super_admin || data.is_exec_board || data.role === 'admin'
        });
      }
    };
    fetchPerms();
  }, [user]);

  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Scroll to ~8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = HOUR_HEIGHT * 1; // 1 hour past 7 AM = 8 AM
    }
  }, []);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDayET(new Date(event.start_date), date));
  };

  const getPositionedEvents = (dayEvents: GleeWorldEvent[]): PositionedEvent[] => {
    return dayEvents.map(event => {
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000); // default 1hr

      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
      const endHour = endDate.getHours() + endDate.getMinutes() / 60;

      const top = Math.max(0, (startHour - 7) * HOUR_HEIGHT);
      const height = Math.max(HOUR_HEIGHT * 0.4, (endHour - startHour) * HOUR_HEIGHT);

      const category = getCategoryForEvent(event);
      const config = categoryConfigs.find(c => c.id === category);

      return {
        event,
        top,
        height,
        category,
        color: config?.color || '#708090',
      };
    });
  };

  // Detect overlapping events and assign column positions
  const layoutEvents = (positioned: PositionedEvent[]) => {
    const sorted = [...positioned].sort((a, b) => a.top - b.top);
    const columns: { end: number }[] = [];
    const result: (PositionedEvent & { col: number; totalCols: number })[] = [];

    for (const ev of sorted) {
      const evEnd = ev.top + ev.height;
      let col = 0;
      while (col < columns.length && columns[col].end > ev.top + 2) {
        col++;
      }
      columns[col] = { end: evEnd };
      result.push({ ...ev, col, totalCols: 0 });
    }

    // Calculate total columns for each group
    const totalCols = columns.length || 1;
    return result.map(ev => ({ ...ev, totalCols: totalCols }));
  };

  const totalHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
      {/* Day Headers - sticky */}
      <div className="flex flex-shrink-0 border-b border-slate-300">
        {/* Time gutter */}
        <div className="w-14 flex-shrink-0 bg-[#003366] border-r border-[#002244]" />
        {/* Day columns */}
        <div className="flex-1 grid grid-cols-7 bg-[#003366] text-white">
          {days.map((day, idx) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <div
                key={idx}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "py-2 text-center cursor-pointer transition-colors border-r border-[#002244] last:border-r-0",
                  isToday && "bg-[#004488]",
                  isSelected && "bg-[#B8860B]"
                )}
              >
                <div className="text-xs font-medium opacity-80">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-bold leading-tight",
                  isToday && "text-white"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex" style={{ height: totalHeight }}>
          {/* Time gutter */}
          <div className="w-14 flex-shrink-0 relative bg-slate-50 border-r border-slate-300">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-[11px] font-medium text-slate-500"
                style={{ top: (hour - 7) * HOUR_HEIGHT - 7 }}
              >
                {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 grid grid-cols-7 relative">
            {/* Hour lines */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-slate-200"
                style={{ top: (hour - 7) * HOUR_HEIGHT }}
              />
            ))}
            {/* Half-hour lines */}
            {HOURS.map(hour => (
              <div
                key={`half-${hour}`}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: (hour - 7) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* Current time indicator */}
            {(() => {
              const now = new Date();
              const currentHour = now.getHours() + now.getMinutes() / 60;
              if (currentHour >= 7 && currentHour <= 23) {
                const todayIdx = days.findIndex(d => isSameDay(d, now));
                if (todayIdx >= 0) {
                  const topPx = (currentHour - 7) * HOUR_HEIGHT;
                  return (
                    <div
                      className="absolute h-0.5 bg-red-500 z-20"
                      style={{
                        top: topPx,
                        left: `${(todayIdx / 7) * 100}%`,
                        width: `${100 / 7}%`,
                      }}
                    >
                      <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* Day columns with events */}
            {days.map((day, dayIdx) => {
              const dayEvents = getEventsForDate(day);
              const positioned = getPositionedEvents(dayEvents);
              const laid = layoutEvents(positioned);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "relative border-r border-slate-200 last:border-r-0",
                    isToday && "bg-amber-50/40"
                  )}
                  onClick={() => onDateSelect(day)}
                >
                  {/* Events */}
                  {laid.map(({ event, top, height, color, col, totalCols }) => {
                    const textColor = getContrastTextColor(color);
                    const widthPercent = 90 / totalCols;
                    const leftPercent = 4 + col * widthPercent;
                    const startTime = format(new Date(event.start_date), 'h:mm a');
                    const isShort = height < 40;
                    const canEdit = userPermissions?.isAdmin || user?.id === event.created_by;

                    return (
                      <div
                        key={event.id}
                        className="absolute rounded-md shadow-sm cursor-pointer hover:shadow-md hover:brightness-95 transition-all overflow-hidden z-10 border border-white/20"
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 20),
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: color,
                          color: textColor,
                        }}
                        title={`${event.title}\n${startTime}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canEdit) {
                            setEditingEvent(event);
                          } else {
                            setSelectedEvent(event);
                          }
                        }}
                      >
                        <div className={cn("px-1.5 py-0.5 h-full flex", isShort ? "items-center gap-1" : "flex-col")}>
                          <span className="text-[10px] font-semibold truncate leading-tight">{event.title}</span>
                          {!isShort && (
                            <span className="text-[9px] opacity-80 leading-tight">{startTime}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onEventUpdated={onEventDeleted}
      />
      <EditEventDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        onEventUpdated={() => {
          setEditingEvent(null);
          onEventDeleted?.();
        }}
      />
    </div>
  );
};
