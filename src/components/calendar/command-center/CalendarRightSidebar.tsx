// Calendar right sidebar — mini month picker, the selected day's events,
// and the tenant's calendars list with checkbox toggles. Mirrors the
// reference design at /dashboard/calendar.

import { useMemo } from 'react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Settings, ArrowRight } from 'lucide-react';
import type { GleeWorldEvent } from '@/hooks/useGleeWorldEvents';
import type { CalendarInfo } from '@/hooks/useCalendars';

interface Props {
  currentMonth: Date;
  selectedDate: Date;
  onMonthChange: (d: Date) => void;
  onDateSelect: (d: Date) => void;
  events: GleeWorldEvent[];           // events filtered for the selected day
  calendars: CalendarInfo[];
  activeCalendarFilters: string[];
  onToggleCalendarFilter: (id: string) => void;
  onAddCalendar?: () => void;
  onManageCalendars?: () => void;
  getEventColor: (e: GleeWorldEvent) => string;
  width?: number;
}

export function CalendarRightSidebar({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect,
  events,
  calendars,
  activeCalendarFilters,
  onToggleCalendarFilter,
  onAddCalendar,
  onManageCalendars,
  getEventColor,
  width,
}: Props) {
  // Mini month grid: 6 weeks of 7 days starting Sunday.
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const dayEvents = useMemo(() =>
    [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
  [events]);

  return (
    <aside
      style={width ? { width } : undefined}
      className={`${width ? '' : 'w-72'} shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto`}
    >
      {/* Mini month picker */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-sm text-muted-foreground font-medium mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d) => {
            const isCurMonth = isSameMonth(d, currentMonth);
            const isToday = isSameDay(d, new Date());
            const isSelected = isSameDay(d, selectedDate);
            return (
              <button
                key={d.toISOString()}
                onClick={() => onDateSelect(d)}
                className={`h-7 text-xs rounded-full inline-flex items-center justify-center
                  ${isSelected ? 'bg-primary text-primary-foreground font-semibold' :
                    isToday ? 'bg-primary/10 text-primary font-semibold' :
                    isCurMonth ? 'text-foreground hover:bg-muted' :
                    'text-muted-foreground/60 hover:bg-muted'}`}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day's events */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold mb-3">{format(selectedDate, 'EEEE, MMMM d')}</h3>
        {dayEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No events on this day.</p>
        ) : (
          <ul className="space-y-3">
            {dayEvents.slice(0, 6).map((ev) => (
              <li key={ev.id} className="flex gap-2 text-sm">
                <div className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                  {format(parseISO(ev.start_date), 'h:mm a')}
                </div>
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: getEventColor(ev) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{ev.title}</div>
                  {ev.location && (
                    <div className="text-xs text-muted-foreground truncate">{ev.location}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => onDateSelect(selectedDate)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
        >
          View full day <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Calendars list with toggles */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold mb-3">Calendars</h3>
        {calendars.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No calendars yet.</p>
        ) : (
          <ul className="space-y-2">
            {calendars.map((c) => {
              const active = activeCalendarFilters.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleCalendarFilter(c.id)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded inline-flex items-center justify-center shrink-0 transition
                        ${active ? '' : 'opacity-40 grayscale'}`}
                      style={{ background: c.color || '#94a3b8' }}
                    >
                      {active && (
                        <svg viewBox="0 0 20 20" className="w-3 h-3 text-white"><path fill="currentColor" d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 011.4-1.4L8.6 12l6.7-6.7a1 1 0 011.4 0z"/></svg>
                      )}
                    </span>
                    <span className={`text-sm ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {c.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add / Manage */}
      <div className="p-4 mt-auto space-y-2">
        {onAddCalendar && (
          <button
            onClick={onAddCalendar}
            className="w-full flex items-center justify-between text-sm text-foreground hover:bg-muted rounded-lg px-3 py-2"
          >
            <span className="font-medium">Add Calendar</span>
            <Plus className="w-4 h-4" />
          </button>
        )}
        {onManageCalendars && (
          <button
            onClick={onManageCalendars}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-3 py-2"
          >
            <span className="font-medium">Manage Calendars</span>
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
