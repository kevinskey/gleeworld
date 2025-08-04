import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, ClockIcon, UsersIcon, EditIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EditEventDialog } from "./EditEventDialog";
import { useAuth } from "@/contexts/AuthContext";
import { EventHoverCard } from "./EventHoverCard";
import { getEventTypeColor, getStatusColor } from "@/utils/colorUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EventsListProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const EventsList = ({ events, onEventUpdated }: EventsListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GleeWorldEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleDeleteEvent = async (event: GleeWorldEvent) => {
    setDeleteLoading(event.id);
    try {
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully!",
      });

      onEventUpdated?.();
    } catch (err) {
      console.error('Error deleting event:', err);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEventClick = (event: GleeWorldEvent) => {
    const canEdit = user && (user.id === event.created_by || user.role === 'admin' || user.role === 'super-admin');
    
    if (canEdit) {
      setEditingEvent(event);
    } else {
      setSelectedEvent(event);
    }
  };

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
          <p className="text-muted-foreground">There are no upcoming events to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Upcoming Events</h3>
        <Badge variant="secondary" className="text-xs">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      {events.map(event => {
        const canEdit = user && (user.id === event.created_by || user.role === 'admin' || user.role === 'super-admin');
        const eventDate = new Date(event.start_date);
        
        return (
          <EventHoverCard key={event.id} event={event} canEdit={canEdit}>
            <Card 
              className={`
                transition-all duration-200 cursor-pointer group border-l-4 touch-manipulation
                ${(selectedEvent?.id === event.id || editingEvent?.id === event.id)
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.01] shadow-lg border-l-primary'
                  : 'hover:shadow-lg border-l-primary/30 hover:border-l-primary active:scale-[0.99]'
                }
              `}
              onClick={() => handleEventClick(event)}
            >
            <CardContent className="p-4">
              {/* Event Image */}
              {event.image_url && (
                <div className="mb-3">
                  <img 
                    src={event.image_url} 
                    alt={event.title}
                    className="w-full h-32 object-cover rounded-md border"
                    onError={(e) => {
                      console.log('Failed to load event image:', event.image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* Mobile-optimized layout */}
              <div className="space-y-3">
                {/* Header Section */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base leading-tight text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h4>
                    
                    {/* Event type and status badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge className={`${getEventTypeColor(event.event_type)} text-xs`}>
                        {event.event_type || 'Event'}
                      </Badge>
                      
                      {event.status && event.status !== 'scheduled' && (
                        <Badge 
                          className={`${getStatusColor(event.status)} text-xs`}
                        >
                          {event.status}
                        </Badge>
                      )}
                      
                      {canEdit && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          <EditIcon className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Editable</span>
                          <span className="sm:hidden">Edit</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action indicators */}
                  <div className="flex-shrink-0 self-start flex items-center gap-2">
                    {canEdit && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                            disabled={deleteLoading === event.id}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{event.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteEvent(event)}
                              disabled={deleteLoading === event.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteLoading === event.id ? "Deleting..." : "Delete Event"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>

                {/* Event Details - Mobile Optimized Grid */}
                <div className="space-y-2 text-sm">
                  {/* Date and Time */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {format(eventDate, 'EEEE, MMM d, yyyy')}
                      </div>
                      <div className="text-xs">
                        {format(eventDate, 'h:mm a')}
                        {event.end_date && (
                          <> - {format(new Date(event.end_date), 'h:mm a')}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {(event.location || event.venue_name) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {event.venue_name && (
                          <div className="font-medium text-foreground truncate">
                            {event.venue_name}
                          </div>
                        )}
                        {event.location && (
                          <div className="text-xs truncate">
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {(event.max_attendees || event.registration_required) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      {event.max_attendees && (
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-3 w-3" />
                          <span>Max {event.max_attendees}</span>
                        </div>
                      )}
                       {event.registration_required && (
                         <Badge variant="outline" className="text-xs bg-event-rehearsal text-event-rehearsal-fg border-current">
                           Registration Required
                         </Badge>
                       )}
                    </div>
                  )}
                </div>

                {/* Description (if exists) */}
                {event.description && (
                  <div className="text-sm text-muted-foreground pt-2 border-t border-border/50">
                    <p className="line-clamp-2">{event.description}</p>
                  </div>
                )}

                {/* Action Hint */}
                <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
                  {canEdit ? "Tap to edit event" : "Tap for details"}
                </div>
              </div>
            </CardContent>
          </Card>
          </EventHoverCard>
        );
      })}

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
    </div>
  );
};