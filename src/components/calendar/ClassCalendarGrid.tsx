import React from 'react';
import { format, isSameDay, isSameMonth, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertCircle, BookOpen, Music, Users, GraduationCap } from 'lucide-react';

interface ClassSession {
  id: string;
  title: string;
  session_type: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  attendance_required?: boolean;
}

interface CampusEvent {
  id: string;
  title: string;
  start_date: string;
}

interface ClassCalendarGridProps {
  days: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  sessions: ClassSession[];
  campusEvents?: CampusEvent[];
  exceptionDates?: string[];
  onSelectDate: (date: Date) => void;
  view: 'month' | 'week';
  getSessionsForDate: (date: Date) => ClassSession[];
}

const SESSION_ICONS: Record<string, React.ElementType> = {
  class: BookOpen,
  rehearsal: Music,
  lab: BookOpen,
  workshop: Users,
  lecture: GraduationCap,
};

export const ClassCalendarGrid: React.FC<ClassCalendarGridProps> = ({
  days,
  currentDate,
  selectedDate,
  campusEvents = [],
  exceptionDates = [],
  onSelectDate,
  view,
  getSessionsForDate,
}) => {
  const getCampusEventsForDate = (day: Date) => {
    return campusEvents.filter(e => {
      const eventDate = parseISO(e.start_date);
      return isSameDay(eventDate, day);
    });
  };

  if (view === 'week') {
    return (
      <div className="space-y-0">
        {/* Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {days.map((day, i) => {
            const isCurrentDay = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button
                key={i}
                onClick={() => onSelectDate(day)}
                className={cn(
                  "text-center py-3 rounded-xl transition-all",
                  isCurrentDay && "bg-primary text-primary-foreground",
                  isSelected && !isCurrentDay && "bg-primary/20 ring-2 ring-primary",
                  !isCurrentDay && !isSelected && "hover:bg-muted"
                )}
              >
                <div className="text-xs font-medium uppercase tracking-wide opacity-70">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-2xl font-bold mt-1",
                  isCurrentDay && "text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Week Content */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const daySessions = getSessionsForDate(day);
            const dayCampusEvents = getCampusEventsForDate(day);
            const isHoliday = exceptionDates.includes(format(day, 'yyyy-MM-dd'));
            const isCurrentDay = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={i}
                onClick={() => onSelectDate(day)}
                className={cn(
                  "min-h-[180px] p-3 rounded-xl border-2 text-left transition-all",
                  isHoliday && "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
                  isCurrentDay && !isHoliday && "border-primary bg-primary/5",
                  isSelected && !isCurrentDay && !isHoliday && "border-primary/50 bg-primary/10",
                  !isSelected && !isCurrentDay && !isHoliday && "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                {isHoliday && (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
                    <AlertCircle className="h-4 w-4" />
                    No Class
                  </div>
                )}
                
                <div className="space-y-2">
                  {/* Campus Events */}
                  {dayCampusEvents.map(event => (
                    <div
                      key={event.id}
                      className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-lg px-2.5 py-2 text-sm font-medium"
                    >
                      {event.title}
                    </div>
                  ))}
                  
                  {/* Class Sessions */}
                  {daySessions.map(session => {
                    const IconComponent = SESSION_ICONS[session.session_type] || BookOpen;
                    return (
                      <div
                        key={session.id}
                        className="bg-primary/10 dark:bg-primary/20 text-primary rounded-lg px-2.5 py-2"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                          <IconComponent className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {session.start_time} - {session.end_time}
                        </div>
                      </div>
                    );
                  })}
                  
                  {daySessions.length === 0 && dayCampusEvents.length === 0 && !isHoliday && (
                    <div className="text-sm text-muted-foreground text-center py-6 opacity-50">
                      No events
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Month View
  return (
    <div className="space-y-0">
      {/* Month Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-3 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const daySessions = getSessionsForDate(day);
          const dayCampusEvents = getCampusEventsForDate(day);
          const isHoliday = exceptionDates.includes(format(day, 'yyyy-MM-dd'));
          const isCurrentDay = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const totalEvents = daySessions.length + dayCampusEvents.length;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                "min-h-[100px] p-2 rounded-xl border-2 text-left transition-all relative",
                !isCurrentMonth && "opacity-40",
                isHoliday && isCurrentMonth && "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
                isCurrentDay && !isHoliday && "border-primary bg-primary/5",
                isSelected && !isCurrentDay && !isHoliday && "border-primary/50 bg-primary/10",
                !isSelected && !isCurrentDay && !isHoliday && "border-transparent hover:border-primary/30 hover:bg-muted/50"
              )}
            >
              {/* Date number */}
              <div className={cn(
                "text-base font-bold mb-1 flex items-center gap-1",
                isCurrentDay && "text-primary",
                isHoliday && "text-amber-600 dark:text-amber-400"
              )}>
                {format(day, 'd')}
                {isHoliday && <AlertCircle className="h-3.5 w-3.5" />}
              </div>

              {/* Event indicators */}
              <div className="space-y-1">
                {dayCampusEvents.slice(0, 1).map(event => (
                  <div
                    key={event.id}
                    className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-md px-1.5 py-1 truncate font-medium"
                  >
                    {event.title}
                  </div>
                ))}
                
                {daySessions.slice(0, 2 - dayCampusEvents.length).map(session => {
                  const IconComponent = SESSION_ICONS[session.session_type] || BookOpen;
                  return (
                    <div
                      key={session.id}
                      className="text-xs bg-primary/15 text-primary rounded-md px-1.5 py-1 truncate flex items-center gap-1 font-medium"
                    >
                      <IconComponent className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </div>
                  );
                })}
                
                {totalEvents > 2 && (
                  <div className="text-xs text-muted-foreground font-medium">
                    +{totalEvents - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
