import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Music, BookOpen, Church, Mic, Users, Plane, User, MapPin, Clock, Trash2, ClipboardList, Edit, Eye, QrCode, ClipboardCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventQRCode } from "../EventQRCode";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventHoverCard } from "../EventHoverCard";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { EditEventDialog } from "../EditEventDialog";
import { EventDetailDialog } from "../EventDetailDialog";
import { EventAttendanceDialog } from "./EventAttendanceDialog";

// Determine if text should be white or dark based on background color luminance
const getContrastTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a2e' : '#ffffff';
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music,
  'book-open': BookOpen,
  church: Church,
  mic: Mic,
  users: Users,
  plane: Plane,
  user: User,
  clipboard: ClipboardList,
};

interface CommandCenterEventCardProps {
  event: GleeWorldEvent;
  categoryColor: string;
  categoryIcon: string;
  compact?: boolean;
  onClick?: () => void;
  onEventDeleted?: () => void;
}

export const CommandCenterEventCard = ({
  event,
  categoryColor,
  categoryIcon,
  compact = false,
  onClick,
  onEventDeleted,
}: CommandCenterEventCardProps) => {
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userPermissions, setUserPermissions] = useState<{isAdmin: boolean, isSuperAdmin: boolean, isExecBoard: boolean} | null>(null);
  
  const isMobile = useIsMobile();
  const Icon = CATEGORY_ICONS[categoryIcon] || Music;
  const startTime = format(new Date(event.start_date), 'h:mm a');

  // Fetch user permissions on mount
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
            isAdmin: userProfile.is_admin || userProfile.role === 'admin',
            isSuperAdmin: userProfile.is_super_admin || userProfile.role === 'super-admin',
            isExecBoard: userProfile.is_exec_board || false
          });
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setUserPermissions(null);
      }
    };
    fetchUserPermissions();
  }, [user]);

  // Check if user can edit/delete this event
  const canEdit = userPermissions && (
    userPermissions.isSuperAdmin || 
    userPermissions.isAdmin || 
    userPermissions.isExecBoard ||
    user?.id === event.created_by
  );

  const canDelete = canEdit;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Event deleted successfully');
      onEventDeleted?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (canEdit) {
      setShowEditDialog(true);
    } else {
      setShowViewDialog(true);
    }
  };

  const textColor = getContrastTextColor(categoryColor);

  const cardContent = compact ? (
    // Compact view for monthly grid
    <div
      onClick={handleCardClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:opacity-90 transition-all shadow-sm"
      style={{ backgroundColor: categoryColor, color: textColor }}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="text-xs font-medium truncate flex-1">{event.title}</span>
      <span className="text-[10px] opacity-80 flex-shrink-0">{startTime}</span>
    </div>
  ) : (
    // Full view for agenda/run sheet
    <div
      onClick={handleCardClick}
      className="group flex flex-col rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
      style={{ borderLeftColor: categoryColor }}
    >
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 p-3 pb-2">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ backgroundColor: categoryColor }}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-[#003366] transition-colors">
            {event.title}
          </h4>
          {event.gw_calendars?.name && (
            <span 
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: categoryColor }}
            >
              {event.gw_calendars.name}
            </span>
          )}
        </div>
      </div>

      {/* Details strip */}
      <div className="px-3 pb-3 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <span className="text-xs font-medium">
            {startTime}
            {event.end_date && ` - ${format(new Date(event.end_date), 'h:mm a')}`}
          </span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="text-xs truncate">{event.location}</span>
          </div>
        )}
        {isMobile && canEdit && (
          <div className="pt-2 flex flex-wrap items-stretch gap-2" onClick={(e) => e.stopPropagation()}>
            <EventQRCode eventId={event.id} eventTitle={event.title} />
            <Button
              variant="outline"
              onClick={() => setShowAttendanceDialog(true)}
              className="h-auto py-4 flex-col gap-2 hover:bg-secondary/80"
            >
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Attendance</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <EventHoverCard event={event} canEdit={canEdit}>
              {cardContent}
            </EventHoverCard>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {/* Event title header */}
          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b border-border mb-1">
            <div className="truncate">{event.title}</div>
            <div className="text-xs font-normal">
              {format(new Date(event.start_date), 'MMM d, yyyy')}
            </div>
          </div>
          
          {/* View Details - always available */}
          <ContextMenuItem 
            onClick={() => setShowViewDialog(true)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </ContextMenuItem>

          {/* View Attendance - admins/exec board */}
          {canEdit && (
            <ContextMenuItem
              onClick={() => setShowAttendanceDialog(true)}
              className="gap-2"
            >
              <ClipboardCheck className="h-4 w-4" />
              View Attendance
            </ContextMenuItem>
          )}
          
          {/* Edit Event - only if user has permission */}
          {canEdit && (
            <ContextMenuItem 
              onClick={() => setShowEditDialog(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Event
            </ContextMenuItem>
          )}
          
          {/* Delete Event - only if user has permission */}
          {canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Event
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete Confirmation Dialog */}
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
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={showEditDialog ? event : null}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEventUpdated={() => {
          setShowEditDialog(false);
          onEventDeleted?.();
        }}
      />

      {/* View Event Details Dialog */}
      <EventDetailDialog
        event={showViewDialog ? event : null}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        onEventUpdated={onEventDeleted}
      />

      {/* Attendance Dialog */}
      <EventAttendanceDialog
        event={showAttendanceDialog ? event : null}
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
      />
    </>
  );
};
