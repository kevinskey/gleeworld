import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EditEventDialog } from "./EditEventDialog";
import { CreateEventDialog } from "./CreateEventDialog";
import { EventContextMenu } from "./EventContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MonthlyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
  currentDate?: Date;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

export const MonthlyCalendar = ({ 
  events, 
  onEventUpdated,
  currentDate: externalCurrentDate,
  selectedDate: externalSelectedDate,
  onDateSelect,
  onMonthChange
}: MonthlyCalendarProps) => {
  const { user } = useAuth();
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GleeWorldEvent | null>(null);
  const [userPermissions, setUserPermissions] = useState<{isAdmin: boolean, isSuperAdmin: boolean} | null>(null);
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null);

  const currentDate = externalCurrentDate ?? internalCurrentDate;
  const selectedDate = externalSelectedDate ?? internalSelectedDate;

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) {
        setUserPermissions(null);
        return;
      }
      try {
        const { data: userProfile } = await supabase
          .from('gw_profiles')
          .select('is_admin, is_super_admin, role')
          .eq('user_id', user.id)
          .single();

        if (userProfile) {
          setUserPermissions({
            isAdmin: userProfile.is_admin || userProfile.role === 'admin',
            isSuperAdmin: userProfile.is_super_admin || userProfile.role === 'super-admin'
          });
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setUserPermissions(null);
      }
    };
    fetchUserPermissions();
  }, [user]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const handleDateClick = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(date);
    } else {
      setInternalSelectedDate(date);
    }
  };

  const handleEventClick = async (event: GleeWorldEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      setSelectedEvent(event);
      return;
    }

    const canEdit = userPermissions && (
      userPermissions.isSuperAdmin || 
      userPermissions.isAdmin || 
      user.id === event.created_by
    );
    
    if (canEdit) {
      setEditingEvent(event);
    } else {
      setSelectedEvent(event);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    if (onMonthChange) {
      onMonthChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const showInternalNav = !externalCurrentDate;

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-slate-800 text-white flex-shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div
            key={idx}
            className="py-3 text-center text-sm font-semibold tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] p-2 cursor-pointer transition-all border-b border-r border-slate-200 flex flex-col",
                isCurrentMonth ? "bg-slate-50" : "bg-slate-100",
                isToday && "bg-blue-50",
                isSelected && "bg-primary/10 ring-2 ring-inset ring-primary",
                "hover:bg-slate-100"
              )}
            >
              {/* Date Number */}
              <div className={cn(
                "text-sm font-medium mb-1",
                !isCurrentMonth && "text-slate-400",
                isToday && "text-primary font-bold",
                isSelected && "text-primary font-bold"
              )}>
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full",
                  isToday && "bg-primary text-white"
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              {hasEvents && (
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const calendarColor = event.gw_calendars?.color || '#3b82f6';
                    
                    const canEdit = userPermissions && (
                      userPermissions.isSuperAdmin || 
                      userPermissions.isAdmin || 
                      user?.id === event.created_by
                    );

                    return (
                      <EventContextMenu
                        key={event.id}
                        event={event}
                        canEdit={!!canEdit}
                        canDelete={!!canEdit}
                        onView={() => setSelectedEvent(event)}
                        onEdit={() => setEditingEvent(event)}
                        onDeleted={onEventUpdated}
                      >
                        <div
                          onClick={(e) => handleEventClick(event, e)}
                          className="text-xs px-2 py-1 rounded font-medium truncate cursor-pointer hover:opacity-80 transition-opacity text-white shadow-sm"
                          style={{ backgroundColor: calendarColor }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      </EventContextMenu>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-slate-500 font-medium pl-1">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
        onEventUpdated={() => {
          setEditingEvent(null);
          onEventUpdated?.();
        }}
      />

      {createEventDate && (
        <CreateEventDialog
          onEventCreated={() => {
            setCreateEventDate(null);
            onEventUpdated?.();
          }}
          initialDate={createEventDate}
        />
      )}
    </div>
  );
};