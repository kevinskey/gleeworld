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
          .select('is_admin, is_super_admin, is_exec_board, role')
          .eq('user_id', user.id)
          .single();

        if (userProfile) {
          setUserPermissions({
            isAdmin: userProfile.is_admin || userProfile.role === 'admin' || userProfile.is_exec_board,
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
    <div className="flex flex-col h-full bg-slate-100 rounded-xl shadow-sm border border-slate-400 overflow-hidden">
      {/* Day Headers - Compact on tablet */}
      <div className="grid grid-cols-7 bg-slate-800 text-white flex-shrink-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div
            key={idx}
            className="py-1.5 md:py-2 text-center text-xs md:text-sm font-semibold tracking-wide"
          >
            <span className="md:hidden">{day}</span>
            <span className="hidden md:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid - More compact cells */}
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
                "min-h-[60px] md:min-h-[70px] lg:min-h-[90px] p-1 md:p-1.5 cursor-pointer transition-all border-b border-r border-slate-400 flex flex-col",
                isCurrentMonth ? "bg-slate-50" : "bg-slate-100",
                isToday && "bg-blue-50",
                isSelected && "bg-primary/10 ring-2 ring-inset ring-primary",
                "hover:bg-slate-100"
              )}
            >
              {/* Date Number - Compact */}
              <div className={cn(
                "text-xs md:text-sm font-medium mb-0.5",
                !isCurrentMonth && "text-slate-400",
                isToday && "text-primary font-bold",
                isSelected && "text-primary font-bold"
              )}>
                <span className={cn(
                  "inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full text-xs md:text-sm",
                  isToday && "bg-primary text-white"
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events - Show dots on tablet, full labels on desktop */}
              {hasEvents && (
                <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                  {/* Desktop: show event titles */}
                  <div className="hidden lg:flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((event) => {
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
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-80 transition-opacity text-white shadow-sm"
                            style={{ backgroundColor: calendarColor }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        </EventContextMenu>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-slate-500 font-medium pl-0.5">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>
                  
                  {/* Tablet: show color dots only */}
                  <div className="flex lg:hidden flex-wrap gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 4).map((event) => {
                      const calendarColor = event.gw_calendars?.color || '#3b82f6';
                      return (
                        <div
                          key={event.id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: calendarColor }}
                          title={event.title}
                        />
                      );
                    })}
                    {dayEvents.length > 4 && (
                      <span className="text-[9px] text-slate-500">+{dayEvents.length - 4}</span>
                    )}
                  </div>
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