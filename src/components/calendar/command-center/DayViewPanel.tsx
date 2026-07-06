import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Calendar, QrCode, ClipboardCheck, Loader2, ChevronRight } from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
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

/** Apple Calendar iPad day view: week strip on top, single-day time grid on
 *  the left, and the event inspector panel on the right — light gray panel,
 *  white rounded rows, text-only red delete pill. */
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

  // Apple-style white rounded row
  const row = "w-full rounded-2xl bg-white px-4 py-3 flex items-center justify-between text-left";

  return (
    // Bounded to the viewport (topbar + page/calendar headers ≈ 215px) so the
    // time grid scrolls internally and the initial position lands at 7 AM
    // instead of midnight. min-h keeps short windows usable.
    <div className="flex flex-col bg-white overflow-hidden h-[calc(100dvh-215px)] min-h-[480px]">
      {/* Week strip — plain, hairline below, today circled */}
      <div className="flex border-b border-slate-200 bg-white">
        <div className="w-16 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onDateSelect(day)}
                className="py-2.5 flex items-center justify-center gap-1.5 transition-colors hover:bg-slate-50"
              >
                <span className={cn(
                  "text-[15px]",
                  isToday || isSelected ? "font-semibold text-foreground" : "text-muted-foreground",
                )}>
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-[15px] tabular-nums",
                  isToday && "bg-primary text-primary-foreground font-bold",
                  !isToday && isSelected && "bg-slate-800 text-white font-semibold",
                  !isToday && !isSelected && "text-muted-foreground",
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

        {/* Inspector — Apple: light gray panel, white rounded rows */}
        <aside className="w-[34%] min-w-[300px] max-w-[420px] flex-shrink-0 bg-slate-100/90 flex flex-col">
          {selectedEvent ? (
            <>
              <div className="px-5 pt-5 pb-4 flex-1 overflow-y-auto">
                {/* Title + Edit */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-[22px] font-bold leading-tight text-foreground">
                    {selectedEvent.title}
                  </h2>
                  {canEditSelected && (
                    <button
                      type="button"
                      data-compact
                      onClick={() => setShowEditDialog(true)}
                      className="h-8 px-4 rounded-full text-[15px] font-medium bg-slate-200/90 text-foreground hover:bg-slate-300 transition-colors flex-shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Date left, time right — no icons, like Apple */}
                <div className="flex items-baseline justify-between gap-2 text-[15px] text-foreground mb-1">
                  <span>{format(new Date(selectedEvent.start_date), 'EEEE, MMM d, yyyy')}</span>
                  <span className="whitespace-nowrap">
                    {format(new Date(selectedEvent.start_date), 'h:mm a')}
                    {selectedEvent.end_date && ` – ${format(new Date(selectedEvent.end_date), 'h:mm a')}`}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="text-[15px] text-muted-foreground mb-1">
                    {selectedEvent.location}
                  </div>
                )}

                <div className="space-y-3 mt-5">
                  {/* Calendar row */}
                  <div className={row}>
                    <span className="text-[15px] font-medium text-foreground">Calendar</span>
                    <span className="flex items-center gap-2 text-[15px] text-muted-foreground">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedConfig?.color || '#708090' }}
                      />
                      {selectedEvent.gw_calendars?.name || selectedConfig?.label || 'Events'}
                    </span>
                  </div>

                  {/* GleeWorld actions as Apple-style rows */}
                  {canEditSelected && (
                    <>
                      <EventQRCode
                        eventId={selectedEvent.id}
                        eventTitle={selectedEvent.title}
                        trigger={
                          <button type="button" data-compact className={row}>
                            <span className="text-[15px] font-medium text-foreground flex items-center gap-2.5">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                              QR Check-In
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                          </button>
                        }
                      />
                      <button
                        type="button"
                        data-compact
                        className={row}
                        onClick={() => setShowAttendanceDialog(true)}
                      >
                        <span className="text-[15px] font-medium text-foreground flex items-center gap-2.5">
                          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                          Attendance
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                      </button>
                    </>
                  )}

                  {selectedEvent.description && (
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-[15px] text-foreground whitespace-pre-wrap">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {canEditSelected && (
                <div className="px-5 pb-6 pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-10 px-6 rounded-full text-[15px] font-medium text-red-500 bg-white hover:bg-red-50 shadow-sm transition-colors"
                  >
                    Delete Event
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-[15px] font-medium text-muted-foreground">
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
