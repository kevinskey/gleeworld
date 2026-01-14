import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Eye, Pencil, Trash2, Clock, MapPin, RefreshCw } from 'lucide-react';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { format, parseISO, isPast, isFuture, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// MUS 240 Course ID
const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
const MUS240_CALENDAR_ID = '9b0267e7-5b30-4288-b33f-99a056279011';

interface CourseEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string | null;
  venue_name: string | null;
  status: string;
  attendance_required: boolean;
}

export const Mus240CalendarManager = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['mus240-calendar-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_events')
        .select('*')
        .eq('course_id', MUS240_COURSE_ID)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as CourseEvent[];
    }
  });

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;

    try {
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', deleteEventId);

      if (error) throw error;

      toast({
        title: "Event deleted",
        description: "The event has been removed from the calendar."
      });

      refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive"
      });
    } finally {
      setDeleteEventId(null);
    }
  };

  const filteredEvents = events?.filter(event => {
    const eventDate = parseISO(event.start_date);
    if (activeFilter === 'upcoming') {
      return isFuture(eventDate) || isToday(eventDate);
    } else if (activeFilter === 'past') {
      return isPast(eventDate) && !isToday(eventDate);
    }
    return true;
  }) || [];

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      academic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      deadline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      test: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      meeting: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      performance: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const upcomingCount = events?.filter(e => {
    const d = parseISO(e.start_date);
    return isFuture(d) || isToday(d);
  }).length || 0;

  const pastCount = events?.filter(e => {
    const d = parseISO(e.start_date);
    return isPast(d) && !isToday(d);
  }).length || 0;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">MUS 240 Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Manage class sessions, deadlines, and events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/classes/mus240?section=calendar')}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Student View
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold text-primary">{events?.length || 0}</div>
          <div className="text-xs text-muted-foreground">Total Events</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">{upcomingCount}</div>
          <div className="text-xs text-muted-foreground">Upcoming</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-muted-foreground">{pastCount}</div>
          <div className="text-xs text-muted-foreground">Past Events</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
          <TabsTrigger value="all">All ({events?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading events...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                {activeFilter === 'upcoming' ? 'No upcoming events' : 
                 activeFilter === 'past' ? 'No past events' : 'No events found'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const eventDate = parseISO(event.start_date);
                const isEventPast = isPast(eventDate) && !isToday(eventDate);
                const isEventToday = isToday(eventDate);

                return (
                  <Card
                    key={event.id}
                    className={cn(
                      "p-4 hover:shadow-md transition-shadow",
                      isEventPast && "opacity-60",
                      isEventToday && "border-primary ring-1 ring-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium truncate">{event.title}</h3>
                          <Badge variant="secondary" className={cn("text-xs", getEventTypeColor(event.event_type))}>
                            {event.event_type}
                          </Badge>
                          {isEventToday && (
                            <Badge variant="default" className="text-xs">Today</Badge>
                          )}
                          {event.attendance_required && (
                            <Badge variant="outline" className="text-xs">Attendance Required</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {format(eventDate, 'MMM d, yyyy')} at {format(eventDate, 'h:mm a')}
                            </span>
                          </div>
                          {(event.location || event.venue_name) && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[200px]">
                                {event.venue_name || event.location}
                              </span>
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteEventId(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onEventCreated={() => {
          setShowCreateDialog(false);
          refetch();
          toast({
            title: "Event created",
            description: "The event has been added to the MUS 240 calendar."
          });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
