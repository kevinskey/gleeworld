import { ReactNode, useState } from "react";
import { format } from "date-fns";
import { MapPin, ClipboardCheck, Trash2, Loader2 } from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteCalendarItem } from '@/lib/calendar/deleteCalendarItem';
import { toast } from "sonner";
import { EventQRCode } from "../EventQRCode";
import { EventAttendanceDialog } from "./EventAttendanceDialog";
import { EditEventDialog } from "../EditEventDialog";
import { isGoogleSyncedEvent, isIosSyncedEvent, isSharedFromExternal } from "@/utils/googleCalendarEvents";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUnshareEvent } from "@/hooks/useEventSharing";
import { PublishToCalendarPicker } from "./PublishToCalendarPicker";

interface EventPeekPopoverProps {
  event: GleeWorldEvent;
  color: string;
  canEdit: boolean;
  onEventDeleted?: () => void;
  children: ReactNode;
}

/** Apple Calendar-style event peek: tapping an event opens a small
 *  popover anchored to it with the details; Edit/Delete are deliberate
 *  second steps instead of the full edit dialog opening immediately. */
export const EventPeekPopover = ({
  event,
  color,
  canEdit,
  onEventDeleted,
  children,
}: EventPeekPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const unshare = useUnshareEvent();
  const canUnshare = isSharedFromExternal(event as any, currentUserId);

  const doUnshare = async () => {
    try {
      const r = await unshare.mutateAsync({ shared_event_id: event.id });
      if (r.deleted > 0) {
        toast.success('Unshared — the published copy was removed.');
        onEventDeleted?.();
      } else {
        toast.message('Nothing to un-share.');
      }
    } catch (e: any) {
      toast.error('Un-share failed — ' + (e?.message ?? String(e)));
    }
  };

  // Personal Google/iOS Calendar overlay rows aren't gw_events — no edit,
  // delete, QR, or attendance; they can only be changed in the source app.
  const isGoogleEvent = isGoogleSyncedEvent(event);
  const isIosEvent = isIosSyncedEvent(event);
  const isExternalEvent = isGoogleEvent || isIosEvent;
  const showActions = canEdit && !isExternalEvent;

  const timeRange = `${format(new Date(event.start_date), 'h:mm a')}${
    event.end_date ? ` – ${format(new Date(event.end_date), 'h:mm a')}` : ''
  }`;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteCalendarItem(event as any);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
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
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-80 p-4 rounded-2xl shadow-xl"
          align="start"
          side="bottom"
          collisionPadding={12}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-start gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                style={{ backgroundColor: color }}
              />
              <h3 className="text-base font-bold leading-tight text-foreground">
                {event.title}
              </h3>
            </div>
            {showActions && (
              <button
                type="button"
                data-compact
                onClick={() => { setOpen(false); setShowEditDialog(true); }}
                className="h-7 px-3 rounded-full text-xs font-semibold bg-slate-200 text-foreground hover:bg-slate-300 transition-colors flex-shrink-0"
              >
                Edit
              </button>
            )}
          </div>

          <div className="pl-5 space-y-0.5 text-sm text-muted-foreground">
            <div>{format(new Date(event.start_date), 'EEEE, MMM d, yyyy')}</div>
            <div className="text-foreground font-medium">{timeRange}</div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.gw_calendars?.name && (
              <div className="text-xs">{event.gw_calendars.name}</div>
            )}
            {event.description && (
              <p className="text-xs pt-1 line-clamp-3 whitespace-pre-wrap">
                {event.description}
              </p>
            )}
          </div>

          {isExternalEvent && (
            <div className="mt-3 pl-5 space-y-1">
              <p className="text-xs text-muted-foreground">
                Synced from personal calendar — edit or delete it there.
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Publish to calendar…
              </button>
            </div>
          )}

          {showActions && (
            <div className="mt-3 pl-5 space-y-1">
              <div className="flex items-center gap-1.5">
                <EventQRCode
                  eventId={event.id}
                  eventTitle={event.title}
                  trigger={
                    <Button variant="outline" size="sm" data-compact className="h-7 px-2.5 gap-1.5 text-xs font-medium">
                      QR Check-In
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  data-compact
                  onClick={() => setShowAttendanceDialog(true)}
                  className="h-7 px-2.5 gap-1.5 text-xs font-medium"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Attendance
                </Button>
                <button
                  type="button"
                  data-compact
                  onClick={() => setShowDeleteDialog(true)}
                  className="ml-auto h-7 w-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete event"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {canUnshare && (
                <button
                  type="button"
                  onClick={doUnshare}
                  disabled={unshare.isPending}
                  className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-rose-600"
                >
                  Unshare from personal calendar
                </button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <EditEventDialog
        event={showEditDialog ? event : null}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEventUpdated={() => {
          setShowEditDialog(false);
          onEventDeleted?.();
        }}
      />
      <EventAttendanceDialog
        event={showAttendanceDialog ? event : null}
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
      />
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
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

      {isExternalEvent && (
        <PublishToCalendarPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          source={isGoogleEvent ? 'google_calendar' : 'ios_calendar'}
          sourceEventId={
            isGoogleEvent
              ? ((event as any).google_event_id ?? '')
              : ((event as any).apple_event_id ?? '')
          }
          onPublished={() => toast.success('Published — the event is now on the shared calendar.')}
        />
      )}
    </>
  );
};
