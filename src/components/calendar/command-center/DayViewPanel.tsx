import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Calendar, Clock, MapPin, ClipboardCheck, Trash2, Loader2 } from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { WeeklyTimeGrid } from "./WeeklyTimeGrid";
import { EventQRCode } from "../EventQRCode";
import { EventAttendanceDialog } from "./EventAttendanceDialog";
import { EditEventDialog } from "../EditEventDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DayViewPanelProps {
  events: GleeWorldEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  getCategoryForEvent: (event: GleeWorldEvent) => CategoryFilter;
  categoryConfigs: CategoryConfig[];
  onEventDeleted?: () => void;
}

/** Apple Calendar-style day view for iPad/desktop: week strip on top,
 *  single-day time grid on the left, event inspector panel on the right. */
export const DayViewPanel = ({
  events,
  selectedDate,
  onDateSelect,
  getCategoryForEvent,
  categoryConfigs,
  onEventDeleted,
}: DayViewPanelProps) => {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const fetchPerms = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, role')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCanManage(
          data.is_admin || data.is_super_admin || data.is_exec_board ||
          data.role === 'admin' || data.role === 'super-admin'
        );
      }
    };
    fetchPerms();
  }, [user]);

  // Keep the inspector in sync with the day: if the selected event isn't on
  // the selected day anymore, fall back to that day's first event.
  const dayEvents = useMemo(
    () => events
      .filter((e) => isSameDay(new Date(e.start_date), selectedDate))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
    [events, selectedDate],
  );
  useEffect(() => {
    if (selectedEvent && !dayEvents.some((e) => e.id === selectedEvent.id)) {
      setSelectedEvent(dayEvents[0] ?? null);
    } else if (!selectedEvent && dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
    }
  }, [dayEvents, selectedEvent]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const canEditSelected = canManage || (selectedEvent && user?.id === selectedEvent.created_by);
  const selectedConfig = selectedEvent
    ? categoryConfigs.find((c) => c.id === getCategoryForEvent(selectedEvent))
    : null;

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setIsDeleting(true);
    try {
      // Tell Google first — once the row is gone we can't read its
      // google_event_id anymore (same order as CommandCenterEventCard).
      const { pushEventToGoogle } = await import('@/hooks/useGoogleConnection');
      await pushEventToGoogle(selectedEvent.id, 'delete');
      const { error } = await supabase.from('gw_events').delete().eq('id', selectedEvent.id);
      if (error) throw error;
      toast.success('Event deleted');
      setSelectedEvent(null);
      onEventDeleted?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Week strip */}
      <div className="flex border-b border-slate-200 bg-card">
        <div className="w-14 flex-shrink-0 border-r border-border" />
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onDateSelect(day)}
                className="py-2 flex items-center justify-center gap-1.5 transition-colors hover:bg-muted/50"
              >
                <span className={cn(
                  "text-sm font-semibold",
                  isToday || isSelected ? "text-foreground" : "text-muted-foreground",
                )}>
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && isSelected && "bg-slate-800 text-white",
                  !isToday && !isSelected && "text-foreground",
                )}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid + inspector */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <WeeklyTimeGrid
            events={events}
            currentDate={selectedDate}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            getCategoryForEvent={getCategoryForEvent}
            categoryConfigs={categoryConfigs}
            onEventDeleted={onEventDeleted}
            singleDay
            onEventSelect={setSelectedEvent}
            selectedEventId={selectedEvent?.id ?? null}
          />
        </div>

        {/* Inspector */}
        <aside className="w-[300px] xl:w-[340px] flex-shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col">
          {selectedEvent ? (
            <>
              <div className="p-5 flex-1 overflow-y-auto">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h2 className="text-xl font-bold leading-tight text-foreground">
                    {selectedEvent.title}
                  </h2>
                  {canEditSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-compact
                      className="h-8 px-3.5 rounded-full text-xs font-semibold flex-shrink-0 bg-slate-200 text-foreground hover:bg-slate-300"
                      onClick={() => setShowEditDialog(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground mb-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    {format(new Date(selectedEvent.start_date), 'EEEE, MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    {format(new Date(selectedEvent.start_date), 'h:mm a')}
                    {selectedEvent.end_date && ` – ${format(new Date(selectedEvent.end_date), 'h:mm a')}`}
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{selectedEvent.location}</span>
                    </div>
                  )}
                </div>

                {/* Calendar chip */}
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Calendar</span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedConfig?.color || '#708090' }}
                    />
                    {selectedEvent.gw_calendars?.name || selectedConfig?.label || 'Events'}
                  </span>
                </div>

                {selectedEvent.description && (
                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 mb-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* GleeWorld actions */}
                {canEditSelected && (
                  <div className="flex items-center gap-1.5 mt-4">
                    <EventQRCode eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAttendanceDialog(true)}
                      className="h-8 px-2.5 gap-1.5 text-xs font-medium"
                    >
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      Attendance
                    </Button>
                  </div>
                )}
              </div>

              {canEditSelected && (
                <div className="p-4 border-t border-slate-200 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-5 rounded-full text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 bg-white shadow-sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Event
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {dayEvents.length === 0 ? 'No events this day' : 'Select an event to see details'}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Dialogs */}
      <EditEventDialog
        event={showEditDialog ? selectedEvent : null}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEventUpdated={() => {
          setShowEditDialog(false);
          onEventDeleted?.();
        }}
      />
      <EventAttendanceDialog
        event={showAttendanceDialog ? selectedEvent : null}
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
      />
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
