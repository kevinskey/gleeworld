import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, differenceInMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EditEventDialog } from "./EditEventDialog";
import { EventContextMenu } from "./EventContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const TZ = 'America/New_York';

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 7; // 7 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

const isSameDayET = (date1: Date, date2: Date): boolean => {
  const d1 = toZonedTime(date1, TZ);
  const d2 = toZonedTime(date2, TZ);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const getEventTypeColor = (type: string | null): string => {
  switch (type) {
    case 'performance':
      return 'bg-red-500/90 text-white border-red-600';
    case 'rehearsal':
      return 'bg-blue-500/90 text-white border-blue-600';
    case 'sectionals':
      return 'bg-indigo-500/90 text-white border-indigo-600';
    case 'meeting':
      return 'bg-emerald-500/90 text-white border-emerald-600';
    case 'social':
      return 'bg-pink-500/90 text-white border-pink-600';
    case 'workshop':
      return 'bg-orange-500/90 text-white border-orange-600';
    case 'audition':
      return 'bg-rose-500/90 text-white border-rose-600';
    case 'class_session':
      return 'bg-sky-500/90 text-white border-sky-600';
    case 'assignment':
      return 'bg-amber-500/90 text-white border-amber-600';
    default:
      return 'bg-slate-500/90 text-white border-slate-600';
  }
};

/** Position an event on the time grid */
const getEventPosition = (event: GleeWorldEvent) => {
  const start = toZonedTime(new Date(event.start_date), TZ);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const clampedStart = Math.max(startHour, START_HOUR);

  let endHour = END_HOUR;
  if (event.end_date) {
    const end = toZonedTime(new Date(event.end_date), TZ);
    endHour = end.getHours() + end.getMinutes() / 60;
  } else {
    endHour = startHour + 1; // default 1 hour
  }
  const clampedEnd = Math.min(endHour, END_HOUR);

  const top = (clampedStart - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 20); // min 20px

  return { top, height };
};

/** Resolve overlapping events into columns */
const layoutOverlappingEvents = (events: GleeWorldEvent[]) => {
  if (events.length === 0) return [];

  // Sort by start time, then by duration (longer first)
  const sorted = [...events].sort((a, b) => {
    const aStart = new Date(a.start_date).getTime();
    const bStart = new Date(b.start_date).getTime();
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = a.end_date ? new Date(a.end_date).getTime() : aStart + 3600000;
    const bEnd = b.end_date ? new Date(b.end_date).getTime() : bStart + 3600000;
    return (bEnd - bStart) - (aEnd - aStart);
  });

  type LayoutItem = { event: GleeWorldEvent; column: number; totalColumns: number };
  const groups: GleeWorldEvent[][] = [];
  let currentGroup: GleeWorldEvent[] = [];
  let groupEnd = 0;

  for (const event of sorted) {
    const eventStart = new Date(event.start_date).getTime();
    const eventEnd = event.end_date ? new Date(event.end_date).getTime() : eventStart + 3600000;

    if (currentGroup.length === 0 || eventStart < groupEnd) {
      currentGroup.push(event);
      groupEnd = Math.max(groupEnd, eventEnd);
    } else {
      groups.push(currentGroup);
      currentGroup = [event];
      groupEnd = eventEnd;
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  const result: LayoutItem[] = [];

  for (const group of groups) {
    const columns: GleeWorldEvent[][] = [];

    for (const event of group) {
      const eventStart = new Date(event.start_date).getTime();
      let placed = false;

      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        const lastEnd = lastInCol.end_date
          ? new Date(lastInCol.end_date).getTime()
          : new Date(lastInCol.start_date).getTime() + 3600000;

        if (eventStart >= lastEnd) {
          columns[col].push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
      }
    }

    const totalCols = columns.length;
    columns.forEach((col, colIdx) => {
      col.forEach(event => {
        result.push({ event, column: colIdx, totalColumns: totalCols });
      });
    });
  }

  return result;
};

interface WeeklyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const WeeklyCalendar = ({ events, onEventUpdated }: WeeklyCalendarProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GleeWorldEvent | null>(null);
  const [userPermissions, setUserPermissions] = useState<{isAdmin: boolean; isSuperAdmin: boolean} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) { setUserPermissions(null); return; }
      try {
        const { data } = await supabase
          .from('gw_profiles')
          .select('is_admin, is_super_admin, role')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setUserPermissions({
            isAdmin: data.is_admin || data.role === 'admin',
            isSuperAdmin: data.is_super_admin || data.role === 'super-admin',
          });
        }
      } catch { setUserPermissions(null); }
    };
    fetchUserPermissions();
  }, [user]);

  // Scroll to ~8 AM on mount / week change
  useEffect(() => {
    if (scrollRef.current) {
      const target = (8 - START_HOUR) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = target;
    }
  }, [currentDate]);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const navigateWeek = (dir: 'prev' | 'next') => {
    setCurrentDate(dir === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const getEventsForDate = (date: Date) =>
    events.filter(e => isSameDayET(new Date(e.start_date), date));

  const handleEventClick = (event: GleeWorldEvent) => {
    const canEdit = user && (
      userPermissions?.isSuperAdmin ||
      userPermissions?.isAdmin ||
      user.id === event.created_by
    );
    if (canEdit) setEditingEvent(event);
    else setSelectedEvent(event);
  };

  // Current time indicator position
  const now = toZonedTime(new Date(), TZ);
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const showNowLine = nowHour >= START_HOUR && nowHour <= END_HOUR;
  const nowTop = (nowHour - START_HOUR) * HOUR_HEIGHT;

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col h-full">
      {/* Header Navigation */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-border bg-background shrink-0">
        <h3 className="text-sm sm:text-base font-semibold text-foreground">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 px-3 text-xs font-medium">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers (sticky) */}
      <div className="grid shrink-0 border-b border-border bg-background" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        {/* Gutter */}
        <div className="border-r border-border" />
        {days.map(day => {
          const isToday = isSameDayET(day, new Date());
          return (
            <div
              key={day.toString()}
              className={cn(
                "text-center py-2 border-r border-border last:border-r-0",
                isToday && "bg-primary/10"
              )}
            >
              <div className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                "text-lg font-bold leading-tight",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: '56px repeat(7, 1fr)',
            height: TOTAL_HOURS * HOUR_HEIGHT,
          }}
        >
          {/* Hour labels column */}
          <div className="relative border-r border-border">
            {hours.map(hour => (
              <div
                key={hour}
                className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2 select-none"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
              >
                {format(new Date(2000, 0, 1, hour), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayEvents = getEventsForDate(day);
            const laid = layoutOverlappingEvents(dayEvents);
            const isToday = isSameDayET(day, new Date());

            return (
              <div
                key={day.toString()}
                className={cn(
                  "relative border-r border-border last:border-r-0",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Hour gridlines */}
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Half-hour gridlines */}
                {hours.map(hour => (
                  <div
                    key={`half-${hour}`}
                    className="absolute w-full border-t border-border/20"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Events */}
                {laid.map(({ event, column, totalColumns }) => {
                  const pos = getEventPosition(event);
                  const canEdit = user && userPermissions && (
                    userPermissions.isSuperAdmin ||
                    userPermissions.isAdmin ||
                    user.id === event.created_by
                  );
                  const canDelete = user && userPermissions && (
                    userPermissions.isSuperAdmin ||
                    userPermissions.isAdmin
                  );

                  const widthPercent = 100 / totalColumns;
                  const leftPercent = column * widthPercent;
                  const startDate = new Date(event.start_date);
                  const isShort = pos.height < 40;

                  return (
                    <EventContextMenu
                      key={event.id}
                      event={event}
                      canEdit={!!canEdit}
                      canDelete={!!canDelete}
                      onView={() => setSelectedEvent(event)}
                      onEdit={() => setEditingEvent(event)}
                      onDeleted={onEventUpdated}
                    >
                      <div
                        className={cn(
                          "absolute rounded-md border-l-[3px] cursor-pointer transition-all",
                          "hover:brightness-110 hover:shadow-lg hover:z-20",
                          "overflow-hidden px-1.5 py-0.5",
                          getEventTypeColor(event.event_type)
                        )}
                        style={{
                          top: pos.top + 1,
                          height: pos.height - 2,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          zIndex: 10,
                        }}
                        onClick={() => handleEventClick(event)}
                        title={`${event.title}\n${format(startDate, 'h:mm a')}${event.end_date ? ` – ${format(new Date(event.end_date), 'h:mm a')}` : ''}`}
                      >
                        {isShort ? (
                          <div className="flex items-center gap-1 h-full">
                            <span className="text-[10px] font-semibold truncate leading-none">
                              {event.title}
                            </span>
                            <span className="text-[9px] opacity-80 shrink-0">
                              {format(startDate, 'h:mm')}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="text-[11px] font-semibold truncate leading-tight">
                              {event.title}
                            </div>
                            <div className="text-[10px] opacity-80 leading-tight">
                              {format(startDate, 'h:mm a')}
                              {event.end_date && ` – ${format(new Date(event.end_date), 'h:mm a')}`}
                            </div>
                            {!isShort && pos.height > 55 && event.location && (
                              <div className="text-[9px] opacity-70 truncate mt-0.5">
                                📍 {event.location}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </EventContextMenu>
                  );
                })}
              </div>
            );
          })}

          {/* Current time indicator (spans full width) */}
          {showNowLine && (
            <div
              className="absolute left-14 right-0 z-30 pointer-events-none flex items-center"
              style={{ top: nowTop }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
              <div className="flex-1 h-[2px] bg-red-500" />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onEventUpdated={onEventUpdated}
      />
      <EditEventDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        onEventUpdated={() => { setEditingEvent(null); onEventUpdated?.(); }}
      />
    </div>
  );
};
