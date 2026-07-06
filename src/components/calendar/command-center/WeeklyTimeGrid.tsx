import { useMemo, useRef, useEffect, useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { EventPeekPopover } from "./EventPeekPopover";
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

const START_HOUR = 0;
const HOURS = Array.from({ length: 24 }, (_, i) => i + START_HOUR); // full day, Apple style
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
  /** Render a single day (Apple Calendar day view) instead of the full week. */
  singleDay?: boolean;
  /** When provided, tapping an event reports it here (inspector panel)
      instead of opening the view/edit dialogs. */
  onEventSelect?: (event: GleeWorldEvent) => void;
  /** Highlights the event currently shown in the inspector. */
  selectedEventId?: string | null;
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
  singleDay = false,
  onEventSelect,
  selectedEventId,
}: WeeklyTimeGridProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
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
    if (singleDay) return [selectedDate];
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate, selectedDate, singleDay]);

  // Scroll to ~8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = HOUR_HEIGHT * (7 - START_HOUR); // land at 7 AM
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

      const top = Math.max(0, (startHour - START_HOUR) * HOUR_HEIGHT);
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
    <div className={cn(
      "flex flex-col bg-white overflow-hidden",
      singleDay
        ? "h-full"
        // Week view bounds itself to the viewport so the 24h grid scrolls
        // internally (initial scroll lands at 7 AM instead of midnight).
        : "rounded-xl shadow-sm border border-slate-300 h-[calc(100dvh-215px)] min-h-[480px]",
    )}>
      {/* Day Headers - sticky (hidden in single-day mode: the day view
          renders its own week strip above the grid) */}
      {!singleDay && (
        <div className="flex flex-shrink-0 border-b border-slate-200">
          {/* Time gutter */}
          <div className="w-16 flex-shrink-0 bg-card border-r border-border" />
          {/* Day columns */}
          <div className="flex-1 grid grid-cols-7 bg-card text-foreground">
            {days.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              return (
                <div
                  key={idx}
                  onClick={() => onDateSelect(day)}
                  className="py-2 cursor-pointer transition-colors border-r border-border/50 last:border-r-0 flex items-center justify-center gap-1.5"
                >
                  <span className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold tabular-nums",
                    isToday && "bg-primary text-primary-foreground",
                    !isToday && isSelected && "bg-slate-200 text-foreground",
                    !isToday && !isSelected && "text-foreground",
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex" style={{ height: totalHeight }}>
          {/* Time gutter */}
          <div className={cn("w-16 flex-shrink-0 relative", singleDay ? "bg-white" : "bg-slate-50 border-r border-slate-200")}>
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 7 }}
              >
                {hour === 0 ? '12 AM' : hour === 12 ? 'Noon' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className={cn("flex-1 grid relative", singleDay ? "grid-cols-1" : "grid-cols-7")}>
            {/* Hour lines */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-slate-200"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
              />
            ))}
            {/* Half-hour lines (week view only — Apple's day view is hairlines-only) */}
            {!singleDay && HOURS.map(hour => (
              <div
                key={`half-${hour}`}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* Current time indicator — Apple style: faint line across the
                whole row, solid segment on today's column, time bubble in
                the gutter. */}
            {(() => {
              const now = new Date();
              const currentHour = now.getHours() + now.getMinutes() / 60;
              if (currentHour >= START_HOUR && currentHour <= 24) {
                const todayIdx = days.findIndex(d => isSameDay(d, now));
                if (todayIdx >= 0) {
                  const topPx = (currentHour - START_HOUR) * HOUR_HEIGHT;
                  const colCount = days.length;
                  return (
                    <>
                      <div className="absolute left-0 right-0 h-px bg-red-400/40 z-20" style={{ top: topPx }} />
                      <div
                        className="absolute h-0.5 bg-red-500 z-20"
                        style={{
                          top: topPx,
                          left: `${(todayIdx / colCount) * 100}%`,
                          width: `${100 / colCount}%`,
                        }}
                      >
                        <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                      </div>
                      {/* Time bubble overlaying the gutter */}
                      <div
                        className="absolute z-30 -translate-y-1/2 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 tabular-nums"
                        style={{ top: topPx + 1, left: -60 }}
                      >
                        {format(now, 'h:mm')}
                      </div>
                    </>
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
                    isToday && !singleDay && "bg-primary/[0.04]"
                  )}
                  onClick={() => onDateSelect(day)}
                >
                  {/* Events — Apple Calendar style: upcoming events are solid
                      blocks in the calendar color; past events fade to a
                      pastel tint with the color moved onto the text. */}
                  {laid.map(({ event, top, height, color, col, totalCols }) => {
                    const widthPercent = 90 / totalCols;
                    const leftPercent = 4 + col * widthPercent;
                    const timeRange = event.end_date
                      ? `${format(new Date(event.start_date), 'h:mm')} – ${format(new Date(event.end_date), 'h:mma').toLowerCase()}`
                      : format(new Date(event.start_date), 'h:mm a');
                    const isShort = height < 40;
                    const canEdit = userPermissions?.isAdmin || user?.id === event.created_by;
                    const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
                    const isPast = eventEnd.getTime() < Date.now();
                    const solidText = getContrastTextColor(color);

                    const chip = (
                      <div
                        className={cn(
                          "absolute rounded-lg cursor-pointer hover:brightness-95 transition-all overflow-hidden z-10",
                          selectedEventId === event.id && "ring-2 ring-foreground/30 z-[15]",
                        )}
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 20),
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          ...(isPast
                            ? { backgroundColor: `${color}26`, borderLeft: `3px solid ${color}` }
                            : { backgroundColor: color }),
                        }}
                        title={`${event.title}\n${timeRange}${event.location ? '\n' + event.location : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventSelect?.(event);
                        }}
                      >
                        <div
                          className={cn("px-2 py-1 h-full flex min-w-0", isShort ? "items-center gap-1.5" : "flex-col gap-0.5")}
                          style={{ color: isPast ? color : solidText }}
                        >
                          <span className="text-xs font-semibold leading-tight truncate">
                            {event.title}
                          </span>
                          {!isShort && (
                            <span className="text-[11px] font-medium leading-tight whitespace-nowrap truncate opacity-90">
                              {timeRange}
                            </span>
                          )}
                          {!isShort && height >= 72 && event.location && (
                            <span className="text-[11px] truncate leading-tight opacity-80">
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                    return onEventSelect ? (
                      <span key={event.id}>{chip}</span>
                    ) : (
                      <EventPeekPopover
                        key={event.id}
                        event={event}
                        color={color}
                        canEdit={!!canEdit}
                        onEventDeleted={onEventDeleted}
                      >
                        {chip}
                      </EventPeekPopover>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
