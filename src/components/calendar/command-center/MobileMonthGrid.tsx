import { useMemo, useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { EventQRCode } from "../EventQRCode";
import { OfficeHoursBooking } from "../OfficeHoursBooking";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin } from "lucide-react";

const isSameDayET = (date1: Date, date2: Date): boolean => {
  const tz = 'America/New_York';
  const d1 = toZonedTime(date1, tz);
  const d2 = toZonedTime(date2, tz);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

interface MobileMonthGridProps {
  events: GleeWorldEvent[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  getCategoryForEvent: (event: GleeWorldEvent) => CategoryFilter;
  categoryConfigs: CategoryConfig[];
}

export const MobileMonthGrid = ({
  events,
  currentDate,
  selectedDate,
  onDateSelect,
  getCategoryForEvent,
  categoryConfigs,
}: MobileMonthGridProps) => {
  const { user } = useAuth();
  const [canManageAttendance, setCanManageAttendance] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, role')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCanManageAttendance(
          data.is_admin || data.is_super_admin || data.is_exec_board ||
          data.role === 'admin' || data.role === 'super-admin'
        );
      }
    };
    checkPermissions();
  }, [user]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDayET(new Date(event.start_date), date));
  };

  const getCategoryConfig = (category: CategoryFilter) => {
    return categoryConfigs.find(c => c.id === category);
  };

  const selectedDayEvents = useMemo(() => {
    return events
      .filter(event => isSameDayET(new Date(event.start_date), selectedDate))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events, selectedDate]);

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto">
      {/* Booking Button */}
      <div className="bg-[#003366] flex-shrink-0 px-3 py-2">
        <OfficeHoursBooking />
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-[#003366] text-white flex-shrink-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} className="py-2 text-center text-xs font-bold tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-7 flex-shrink-0">
        {days.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDayET(day, new Date());
          const isSelected = isSameDayET(day, selectedDate);
          const hasEvents = dayEvents.length > 0;

          const categoryColors = hasEvents
            ? [...new Set(dayEvents.map(e => getCategoryConfig(getCategoryForEvent(e))?.color || '#708090'))].slice(0, 3)
            : [];

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "flex flex-col items-center py-2 min-h-[52px] touch-manipulation transition-colors border-b border-r border-slate-100",
                !isCurrentMonth && "opacity-30",
                isSelected && "bg-blue-50",
                isToday && !isSelected && "bg-amber-50/60",
              )}
            >
              <span className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                isToday && "bg-[#003366] text-white",
                isSelected && !isToday && "bg-[#B8860B] text-white",
                !isToday && !isSelected && isCurrentMonth && "text-slate-800",
              )}>
                {format(day, 'd')}
              </span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {categoryColors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Events Panel */}
      <div className="border-t border-slate-200">
        {/* Compact date header */}
        <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#003366' }}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
          <span className="text-xs font-medium text-slate-500">
            {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-2 space-y-1.5">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">No events scheduled</p>
            </div>
          ) : (
            selectedDayEvents.map((event) => {
              const category = getCategoryForEvent(event);
              const config = getCategoryConfig(category);
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-100 shadow-sm"
                >
                  {/* Category color bar */}
                  <div
                    className="w-1 self-stretch min-h-[36px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: config?.color || '#708090' }}
                  />

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_date), 'h:mm a')}
                      </span>
                      {event.location && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact QR button */}
                  {canManageAttendance && (
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <EventQRCode eventId={event.id} eventTitle={event.title} compact />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};