import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, DollarSign, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EventDetailsDialog } from "./EventDetailsDialog";

interface Event {
  id: string;
  title: string;
  event_name: string;
  event_type: string;
  event_date_start: string;
  event_date_end?: string;
  location?: string;
  expected_headcount?: number;
  is_travel_involved: boolean;
  brief_description?: string;
  approved: boolean;
  approval_needed: boolean;
  created_at: string;
}

export const EventsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const getEventTypeDisplay = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'tour_stop': 'bg-primary/10 text-primary border-primary/20',
      'social': 'bg-secondary/10 text-secondary border-secondary/20',
      'banquet': 'bg-accent/10 text-accent border-accent/20',
      'fundraiser': 'bg-muted text-muted-foreground border-border',
      'worship_event': 'bg-primary/15 text-primary border-primary/30',
      'travel': 'bg-secondary/15 text-secondary border-secondary/30',
      'volunteer': 'bg-accent/15 text-accent border-accent/30',
      'meeting': 'bg-muted text-muted-foreground border-border',
      'performance': 'bg-primary/20 text-primary border-primary/40',
      'other': 'bg-muted text-muted-foreground border-border'
    };
    return colors[type] || colors.other;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const openEventDetails = (event: Event) => {
    setSelectedEvent(event);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No events yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first event to start planning and budgeting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {event.event_name || event.title}
                  </CardTitle>
                  <Badge className={getEventTypeColor(event.event_type)}>
                    {getEventTypeDisplay(event.event_type)}
                  </Badge>
                </div>
                {event.approval_needed && (
                  <Badge variant={event.approved ? "default" : "secondary"}>
                    {event.approved ? "Approved" : "Pending"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(event.event_date_start)}
                  {event.event_date_end && ` - ${formatDate(event.event_date_end)}`}
                </span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              
              {event.expected_headcount && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{event.expected_headcount} attendees</span>
                </div>
              )}
              
              {event.brief_description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.brief_description}
                </p>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openEventDetails(event)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Manage
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Budget
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          open={showDetails}
          onOpenChange={setShowDetails}
          onUpdate={fetchEvents}
        />
      )}
    </>
  );
};