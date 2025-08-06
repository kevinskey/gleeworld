import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock, MapPin, Users, Plus, Edit, X, AlertCircle, Settings, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { CalendarManager } from "@/components/calendar/CalendarManager";
import { CalendarExport } from "@/components/calendar/CalendarExport";
import { AppointmentScheduler } from "@/components/appointments/AppointmentScheduler";

export const MasterCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [activeTab, setActiveTab] = useState('calendar');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    event_type: 'rehearsal',
    is_public: true,
    rsvp_required: false,
    calendar_id: ''
  });
  
  const { events, loading, fetchEvents } = useGleeWorldEvents();

  // Get default calendar ID
  const getDefaultCalendarId = async () => {
    const { data } = await supabase
      .from('gw_calendars')
      .select('id')
      .eq('is_default', true)
      .single();
    
    return data?.id || '';
  };

  useEffect(() => {
    const setDefaultCalendar = async () => {
      const calendarId = await getDefaultCalendarId();
      setNewEvent(prev => ({ ...prev, calendar_id: calendarId }));
    };
    setDefaultCalendar();
  }, []);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const calendarId = newEvent.calendar_id || await getDefaultCalendarId();
      const eventData = {
        ...newEvent,
        calendar_id: calendarId,
        start_date: `${newEvent.start_date}T${newEvent.start_time}:00`,
        end_date: `${newEvent.end_date}T${newEvent.end_time}:00`,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('gw_events')
        .insert([eventData]);

      if (error) throw error;

      toast.success('Event created successfully');
      setShowEventDialog(false);
      setNewEvent({
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        location: '',
        event_type: 'rehearsal',
        is_public: true,
        rsvp_required: false,
        calendar_id: calendarId
      });
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success('Event deleted successfully');
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case 'rehearsal':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'performance':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'appointment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    
    return (
      <div className="grid grid-cols-7 gap-2 h-[600px]">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          return (
            <div key={index} className="border border-border rounded-lg p-2 bg-card">
              <div className="font-medium text-sm mb-2 text-card-foreground">
                {format(day, 'EEE dd')}
              </div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity",
                      getEventTypeStyle(event.event_type)
                    )}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-xs opacity-75">
                      {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="border border-border rounded-lg bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-card-foreground">
            {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
          </h3>
        </div>
        <div className="p-4 max-h-[600px] overflow-y-auto">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter(event => {
              const eventDate = new Date(event.start_date);
              return eventDate.getHours() === hour;
            });

            return (
              <div key={hour} className="flex border-b border-border/50 min-h-[60px]">
                <div className="w-16 text-sm text-muted-foreground py-2">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
                <div className="flex-1 p-2">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity",
                        getEventTypeStyle(event.event_type)
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm opacity-75">
                        {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                        {event.location && (
                          <span className="ml-2">📍 {event.location}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Master Calendar Management</h1>
          <p className="text-muted-foreground">
            Complete calendar system with events, appointments, and scheduling
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Quick Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Event Creation</DialogTitle>
                <DialogDescription>
                  Create a new event quickly
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newEvent.start_date}
                      onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newEvent.end_date}
                      onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="event_type">Event Type</Label>
                  <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rehearsal">Rehearsal</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="social">Social Event</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Event location"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={newEvent.is_public}
                    onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_public: checked })}
                  />
                  <Label htmlFor="is_public">Public Event</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCreateEvent} className="flex-1">
                    Create Event
                  </Button>
                  <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="events">Event List</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Calendar Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="w-full"
                  modifiers={{
                    hasEvents: events.map(e => new Date(e.start_date))
                  }}
                />
                
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">View Mode</div>
                  <div className="flex gap-1">
                    {(['month', 'week', 'day'] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={viewMode === mode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode(mode)}
                        className="capitalize flex-1"
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3">
              {viewMode === 'month' && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {format(selectedDate, 'MMMM yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderWeekView()}
                  </CardContent>
                </Card>
              )}
              
              {viewMode === 'week' && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Week of {format(startOfWeek(selectedDate), 'MMMM dd, yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderWeekView()}
                  </CardContent>
                </Card>
              )}
              
              {viewMode === 'day' && renderDayView()}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Events</CardTitle>
              <CardDescription>Manage all calendar events</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading events...</div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(event.start_date), 'PPP')} at {format(new Date(event.start_date), 'p')}
                        </div>
                        {event.location && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      <Badge className={getEventTypeStyle(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Scheduling</CardTitle>
              <CardDescription>Manage appointments and bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentScheduler />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Calendar Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarManager />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export & Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CalendarExport />
                <div className="border-t pt-4">
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedEvent.start_date), 'EEEE, MMMM dd, yyyy')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getEventTypeStyle(selectedEvent.event_type)}>
                  {selectedEvent.event_type}
                </Badge>
                {selectedEvent.is_public && (
                  <Badge variant="outline">Public</Badge>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(selectedEvent.start_date), 'p')} - {format(new Date(selectedEvent.end_date), 'p')}
                </div>
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.location}
                  </div>
                )}
              </div>
              
              {selectedEvent.description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">
                  {events.filter(e => {
                    const start = startOfWeek(new Date());
                    const end = addDays(start, 6);
                    const eventDate = new Date(e.start_date);
                    return eventDate >= start && eventDate <= end;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Performances</p>
                <p className="text-xl font-bold">
                  {events.filter(e => e.event_type === 'performance').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Rehearsals</p>
                <p className="text-xl font-bold">
                  {events.filter(e => e.event_type === 'rehearsal').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Meetings</p>
                <p className="text-xl font-bold">
                  {events.filter(e => e.event_type === 'meeting').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};