import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarViews } from "@/components/calendar/CalendarViews";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { type GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { Calendar, Plus, Search, Filter, Users, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const CalendarManagement = () => {
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [events, setEvents] = useState<GleeWorldEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  // Fetch all events (both public and private for admin view)
  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingEvents = filteredEvents.filter(event => 
    new Date(event.start_date) > new Date()
  );

  const pastEvents = filteredEvents.filter(event => 
    new Date(event.start_date) <= new Date()
  );

  const publicEvents = filteredEvents.filter(event => event.is_public);
  const privateEvents = filteredEvents.filter(event => !event.is_public);

  const handleEventCreated = () => {
    fetchAllEvents();
  };

  const handleEventClick = (event: GleeWorldEvent) => {
    setSelectedEvent(event);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendar Management
          </h2>
          <p className="text-muted-foreground">
            Manage events, bookings, and calendar settings
          </p>
        </div>
        <CreateEventDialog onEventCreated={handleEventCreated} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{filteredEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Public Events</p>
                <p className="text-2xl font-bold">{publicEvents.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Private Events</p>
                <p className="text-2xl font-bold">{privateEvents.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Latest events and activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.is_public ? "default" : "secondary"}>
                        {event.is_public ? "Public" : "Private"}
                      </Badge>
                      <Badge variant="outline">
                        {event.event_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common calendar management tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CreateEventDialog onEventCreated={handleEventCreated} />
                <Button variant="outline" className="w-full justify-start" onClick={() => setSelectedTab("calendar")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage RSVPs
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Venue Management
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="pt-6">
              <CalendarViews />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events ({upcomingEvents.length})</CardTitle>
              <CardDescription>Events scheduled for the future</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{format(new Date(event.start_date), "MMM d, yyyy 'at' h:mm a")}</span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.is_public ? "default" : "secondary"}>
                        {event.is_public ? "Public" : "Private"}
                      </Badge>
                      <Badge variant="outline">
                        {event.event_type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming events found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Events ({pastEvents.length})</CardTitle>
              <CardDescription>Historical events and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 opacity-75"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{format(new Date(event.start_date), "MMM d, yyyy 'at' h:mm a")}</span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.is_public ? "default" : "secondary"}>
                        {event.is_public ? "Public" : "Private"}
                      </Badge>
                      <Badge variant="outline">
                        {event.event_type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {pastEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No past events found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  );
};