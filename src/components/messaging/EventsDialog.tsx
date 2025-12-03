import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, Plus, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

interface GroupEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  event_type: string | null;
  is_public: boolean | null;
  max_attendees: number | null;
  attendance_deadline: string | null;
  registration_required: boolean | null;
  has_rsvped?: boolean;
  attendee_count?: number;
}

export const EventsDialog: React.FC<EventsDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  groupName,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchGroupEvents();
    }
  }, [open, groupId]);

  const fetchGroupEvents = async () => {
    try {
      setLoading(true);

      // Fetch events associated with this group
      // We'll look for events where the group name or description matches
      const { data: eventsData, error: eventsError } = await supabase
        .from('gw_events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(20);

      if (eventsError) throw eventsError;

      // Get RSVP status for each event
      const eventsWithRSVP = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: rsvpData } = await supabase
            .from('gw_event_rsvps')
            .select('id, status')
            .eq('event_id', event.id)
            .eq('user_id', user?.id);

          const { count } = await supabase
            .from('gw_event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'accepted');

          return {
            ...event,
            has_rsvped: rsvpData && rsvpData.length > 0 && rsvpData[0].status === 'accepted',
            attendee_count: count || 0,
          };
        })
      );

      setEvents(eventsWithRSVP);
    } catch (error) {
      console.error('Error fetching group events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        // Remove RSVP
        const { error } = await supabase
          .from('gw_event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: 'RSVP Removed',
          description: 'Your RSVP has been cancelled',
        });
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('gw_event_rsvps')
          .insert({
            event_id: eventId,
            user_id: user?.id,
            status: 'accepted',
          });

        if (error) throw error;

        toast({
          title: 'RSVP Confirmed',
          description: "You're going to this event!",
        });
      }

      // Refresh events
      await fetchGroupEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast({
        title: 'Error',
        description: 'Failed to update RSVP',
        variant: 'destructive',
      });
    }
  };

  const formatEventDate = (startDate: string) => {
    const date = new Date(startDate);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'EEEE, MMM d \'at\' h:mm a');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col bg-background z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[hsl(var(--message-header))]" />
            {groupName} Events
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Create Event Button */}
          <div className="pb-4 border-b">
            <Button
              onClick={() => window.location.href = '/event-planner'}
              className="w-full bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Event
            </Button>
          </div>

          {/* Events List */}
          <ScrollArea className="flex-1 mt-4 h-[calc(85vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--message-header))]"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-[hsl(var(--message-header))]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Create events to coordinate rehearsals, performances, and group activities.
                </p>
                <Button
                  onClick={() => window.location.href = '/event-planner'}
                  variant="outline"
                >
                  Go to Event Planner
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className={cn(
                      "p-4 transition-all hover:shadow-md",
                      event.has_rsvped && "border-[hsl(var(--message-header))]/30 bg-[hsl(var(--message-header))]/5"
                    )}
                  >
                    <div className="space-y-3">
                      {/* Event Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base truncate mb-1">{event.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {event.event_type}
                            </Badge>
                            {event.has_rsvped && (
                              <Badge className="text-xs bg-[hsl(var(--message-header))]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Going
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={event.has_rsvped ? "outline" : "default"}
                          onClick={() => handleRSVP(event.id, event.has_rsvped || false)}
                          className={cn(
                            "flex-shrink-0",
                            !event.has_rsvped && "bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
                          )}
                        >
                          {event.has_rsvped ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              RSVP
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{formatEventDate(event.start_date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        {event.attendee_count > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span>{event.attendee_count} going</span>
                            {event.max_attendees && (
                              <span className="text-xs">
                                (max {event.max_attendees})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* RSVP Deadline */}
                      {event.attendance_deadline && !isPast(new Date(event.attendance_deadline)) && (
                        <div className="text-xs text-muted-foreground">
                          RSVP by {format(new Date(event.attendance_deadline), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
