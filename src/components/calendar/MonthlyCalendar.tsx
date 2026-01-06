import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  // Use external state if provided, otherwise use internal
  const currentDate = externalCurrentDate ?? internalCurrentDate;
  const selectedDate = externalSelectedDate ?? internalSelectedDate;

  // Fetch user permissions
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

  // Calendar grid calculation
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

  // Show internal navigation only if external control not provided
  const showInternalNav = !externalCurrentDate;

  return (
    <div className="flex flex-col h-full">
      {/* Internal Navigation - only show if not externally controlled */}
      {showInternalNav && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (onMonthChange) onMonthChange(new Date());
              else setInternalCurrentDate(new Date());
              if (onDateSelect) onDateSelect(new Date());
              else setInternalSelectedDate(new Date());
            }}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-px bg-border/80 ring-1 ring-inset ring-border/70 rounded-t-lg overflow-hidden flex-shrink-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div
            key={idx}
            className="p-1 sm:p-1.5 text-center text-[10px] sm:text-xs font-semibold text-foreground/80 bg-muted"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-border/80 ring-1 ring-inset ring-border/70 rounded-b-lg overflow-hidden -mt-4 flex-1 auto-rows-fr">
        {days.map(day => {
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
                "min-h-0 p-1 sm:p-1.5 cursor-pointer transition-colors bg-card flex flex-col",
                !isCurrentMonth && "bg-muted/50",
                isToday && "bg-primary/10",
                isSelected && "bg-primary/15 ring-1 ring-inset ring-primary",
                "hover:bg-accent"
              )}
            >
              {/* Date Number */}
              <div className={cn(
                "text-[10px] sm:text-xs font-medium",
                !isCurrentMonth && "text-muted-foreground/50",
                isToday && "text-primary font-bold",
                isSelected && "text-primary"
              )}>
                {format(day, 'd')}
              </div>

              {/* Event Lines - Minimalist indicator */}
              {hasEvents && (
                <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full">
                  {dayEvents.slice(0, 3).map((event) => {
                    const lineClass = (() => {
                      switch (event.event_type) {
                        case 'performance':
                          return 'bg-primary';
                        case 'rehearsal':
                          return 'bg-secondary';
                        case 'meeting':
                          return 'bg-accent';
                        case 'social':
                          return 'bg-muted-foreground';
                        default:
                          return 'bg-primary';
                      }
                    })();

                    const canEdit = userPermissions && (
                      userPermissions.isSuperAdmin || 
                      userPermissions.isAdmin || 
                      user?.id === event.created_by
                    );
                    const canDelete = canEdit;

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
                          onClick={(e) => handleEventClick(event, e)}
                          className={cn(
                            'h-1 sm:h-1.5 w-full rounded-full cursor-pointer hover:opacity-80 transition-opacity',
                            lineClass
                          )}
                          title={event.title}
                        />
                      </EventContextMenu>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
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
