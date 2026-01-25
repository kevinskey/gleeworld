import { format } from "date-fns";
import { Music, BookOpen, Church, Mic, Users, Plane, User, MapPin, Clock, Trash2 } from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { cn } from "@/lib/utils";
import { EventHoverCard } from "../EventHoverCard";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
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
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music,
  'book-open': BookOpen,
  church: Church,
  mic: Mic,
  users: Users,
  plane: Plane,
  user: User,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const Icon = CATEGORY_ICONS[categoryIcon] || Music;
  const startTime = format(new Date(event.start_date), 'h:mm a');

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

  const cardContent = compact ? (
    // Compact view for monthly grid
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:opacity-90 transition-all text-white shadow-sm"
      style={{ backgroundColor: categoryColor }}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="text-xs font-medium truncate flex-1">{event.title}</span>
      <span className="text-[10px] opacity-80 flex-shrink-0">{startTime}</span>
    </div>
  ) : (
    // Full view for agenda/run sheet
    <div
      onClick={onClick}
      className="group flex flex-col rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
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
      </div>
    </div>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <EventHoverCard event={event}>
              {cardContent}
            </EventHoverCard>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Event
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

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
    </>
  );
};
