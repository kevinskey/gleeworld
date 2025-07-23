import { useState, useEffect } from "react";
import { getDefaultEventImage } from "@/constants/images";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, DollarSign, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EditEventDialog } from "./EditEventDialog";

interface Event {
  id: string;
  title: string;
  event_name: string;
  event_type: string;
  event_date_start: string | null;
  event_date_end?: string | null;
  start_date?: string;
  end_date?: string;
  location?: string;
  expected_headcount?: number;
  is_travel_involved: boolean;
  brief_description?: string;
  approved: boolean;
  approval_needed: boolean;
  created_at: string;
  image_url?: string;
  created_by: string;
}

interface EventsListProps {
  filter?: 'all-events' | 'my-events' | 'my-budgets' | 'my-teams';
}

export const EventsList = ({ filter = 'all-events' }: EventsListProps) => {
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

      if (filter === 'all-events') {
        // For all events: show events user has access to (created, team member, admin)
        // Get events user created, leads, or coordinates
        const { data: userEvents } = await supabase
          .from('events')
          .select('*')
          .or(`created_by.eq.${user.id},event_lead_id.eq.${user.id},coordinator_id.eq.${user.id}`);
        
        // Get events where user is team member
        const { data: teamMemberships } = await supabase
          .from('event_team_members')
          .select('event_id, events!inner(*)')
          .eq('user_id', user.id);
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
        
        if (isAdmin) {
          // Admins can see all events
          const { data: allEvents, error } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setEvents(allEvents || []);
          return;
        }
        
        // Combine accessible events
        const accessibleEvents = new Map();
        
        // Add user's direct events
        userEvents?.forEach(event => {
          accessibleEvents.set(event.id, event);
        });
        
        // Add events where user is team member
        teamMemberships?.forEach(item => {
          if (item.events) {
            accessibleEvents.set(item.events.id, item.events);
          }
        });
        
        const finalEvents = Array.from(accessibleEvents.values()).sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setEvents(finalEvents);
        return;
      }

      // Handle other filters
      let query = supabase.from('events').select('*');

      switch (filter) {
        case 'my-events':
          query = query.eq('created_by', user.id);
          break;
        case 'my-budgets':
          query = query.or(`created_by.eq.${user.id},event_lead_id.eq.${user.id}`);
          break;
        case 'my-teams':
          query = query.or(`created_by.eq.${user.id},event_lead_id.eq.${user.id}`);
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Additional filtering for team events
      if (filter === 'my-teams') {
        const { data: teamData, error: teamError } = await supabase
          .from('event_team_members')
          .select('event_id')
          .eq('user_id', user.id);

        if (teamError) throw teamError;

        const teamEventIds = teamData.map(tm => tm.event_id);
        const filteredEvents = data?.filter(event => 
          event.created_by === user.id || 
          event.event_lead_id === user.id || 
          teamEventIds.includes(event.id)
        ) || [];
        
        setEvents(filteredEvents);
      } else {
        setEvents(data || []);
      }
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
  }, [user, filter]);

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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Date TBD';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString();
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
    const emptyMessages = {
      'all-events': 'No events yet',
      'my-events': 'You haven\'t created any events yet',
      'my-budgets': 'You don\'t have any budget worksheets yet',
      'my-teams': 'You\'re not part of any event teams yet'
    };

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">{emptyMessages[filter]}</h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all-events' && "Create your first event to start planning and budgeting."}
            {filter === 'my-events' && "Create an event to get started with planning and budgeting."}
            {filter === 'my-budgets' && "Events with budgets you manage will appear here."}
            {filter === 'my-teams' && "Events where you're a team member will appear here."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
            {/* Event Image */}
            <div className="relative w-full aspect-[4/3] overflow-hidden">
              <img
                src={event.image_url || getDefaultEventImage(event.id)}
                alt={event.event_name || event.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = getDefaultEventImage(event.id);
                }}
              />
              <div className="absolute top-2 right-2 flex gap-1">
                {event.approval_needed && (
                  <Badge variant={event.approved ? "default" : "secondary"} className="bg-background/90 backdrop-blur-sm">
                    {event.approved ? "Approved" : "Pending"}
                  </Badge>
                )}
              </div>
            </div>
            
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
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(event.event_date_start || event.start_date)}
                  {(event.event_date_end || event.end_date) && ` - ${formatDate(event.event_date_end || event.end_date)}`}
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
                {(filter === 'my-budgets' || filter === 'my-events') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Budget
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEvent && (
        <EditEventDialog
          event={selectedEvent}
          open={showDetails}
          onOpenChange={setShowDetails}
          onEventUpdated={fetchEvents}
        />
      )}
    </>
  );
};
