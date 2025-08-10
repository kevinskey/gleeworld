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
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editEvent, setEditEvent] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    event_type: 'rehearsal',
    is_public: true,
    registration_required: false,
  });
  
  const { events, loading, fetchEvents, getEventsByDateRange } = useGleeWorldEvents();

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

  // Editing helpers
  const startEditSelectedEvent = () => {
    if (!selectedEvent) return;
    const s = new Date(selectedEvent.start_date);
    const e = new Date(selectedEvent.end_date || selectedEvent.start_date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setEditEvent({
      title: selectedEvent.title || '',
      description: selectedEvent.description || '',
      start_date: s.toISOString().split('T')[0],
      end_date: e.toISOString().split('T')[0],
      start_time: `${pad(s.getHours())}:${pad(s.getMinutes())}`,
      end_time: `${pad(e.getHours())}:${pad(e.getMinutes())}`,
      location: selectedEvent.location || '',
      event_type: selectedEvent.event_type || 'other',
      is_public: !!selectedEvent.is_public,
      registration_required: !!selectedEvent.registration_required,
    });
    setIsEditing(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    try {
      const updated = {
        title: editEvent.title.trim(),
        description: editEvent.description?.trim() || null,
        event_type: editEvent.event_type,
        start_date: `${editEvent.start_date}T${editEvent.start_time}:00`,
        end_date: `${editEvent.end_date}T${editEvent.end_time}:00`,
        location: editEvent.location?.trim() || null,
        is_public: editEvent.is_public,
        registration_required: editEvent.registration_required,
      } as const;
      const { error } = await supabase
        .from('gw_events')
        .update(updated)
        .eq('id', selectedEvent.id);
      if (error) throw error;
      toast.success('Event updated');
      setIsEditing(false);
      setSelectedEvent({ ...selectedEvent, ...updated });
      fetchEvents();
    } catch (err: any) {
      console.error('Error updating event:', err);
      toast.error(err?.message || 'Failed to update event');
    }
  };
  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const calendarId = newEvent.calendar_id || await getDefaultCalendarId();
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description?.trim() || null,
        event_type: newEvent.event_type,
        start_date: `${newEvent.start_date}T${newEvent.start_time}:00`,
        end_date: `${newEvent.end_date}T${newEvent.end_time}:00`,
        location: newEvent.location?.trim() || null,
        is_public: newEvent.is_public,
        registration_required: newEvent.rsvp_required,
        calendar_id: calendarId,
        created_by: userId,
        status: 'scheduled'
      } as const;

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
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error?.message || 'Failed to create event');
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
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-2 min-h-[400px] md:h-[600px]">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          return (
            <div key={index} className="border border-border rounded-lg p-2 sm:p-3 bg-card min-h-[120px]">
              <div className="font-medium text-xs sm:text-sm mb-2 text-card-foreground">
                {format(day, 'EEE dd')}
              </div>
              <div className="space-y-1 max-h-[300px] sm:max-h-[500px] overflow-y-auto">
                {dayEvents.length === 0 ? (
                  <div className="text-xs text-muted-foreground opacity-50">No events</div>
                ) : (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-1 sm:p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        getEventTypeStyle(event.event_type)
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs opacity-75 hidden sm:block">
                        {format(new Date(event.start_date), 'p')}
                        {event.end_date && ` - ${format(new Date(event.end_date), 'p')}`}
                      </div>
                    </div>
                  ))
                )}
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
                  {format(new Date().setHours(hour, 0), 'h a')}
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
                        {format(new Date(event.start_date), 'p')} - {format(new Date(event.end_date), 'p')}
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
          <CreateEventDialog onEventCreated={fetchEvents} initialDate={selectedDate} />
        </div>
      </div>

      {/* Mobile-Friendly Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-12 sm:h-10">
          <TabsTrigger value="calendar" className="text-sm sm:text-sm px-2 py-3">
            <span className="block sm:hidden">📅</span>
            <span className="hidden sm:block">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="text-sm sm:text-sm px-2 py-3">
            <span className="block sm:hidden">📋</span>
            <span className="hidden sm:block">Events</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="text-sm sm:text-sm px-2 py-3">
            <span className="block sm:hidden">⏰</span>
            <span className="hidden sm:block">Appointments</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-sm sm:text-sm px-2 py-3">
            <span className="block sm:hidden">⚙️</span>
            <span className="hidden sm:block">Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card className="lg:col-span-1 order-2 lg:order-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="w-full"
                  modifiers={{
                    hasEvents: events.map(e => new Date(e.start_date))
                  }}
                />
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">View Mode</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['month', 'week', 'day'] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={viewMode === mode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode(mode)}
                        className="capitalize text-xs"
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Event Stats */}
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Quick Stats</div>
                  <div className="space-y-1 text-xs">
                    <div>Total Events: {events.length}</div>
                    <div>Today: {getEventsForDate(new Date()).length}</div>
                    <div>This Week: {getEventsByDateRange(startOfWeek(new Date()), addDays(startOfWeek(new Date()), 6)).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 order-1 lg:order-2">
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
                <div className="text-center py-8">
                  <div className="animate-pulse">Loading events...</div>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events found. Create your first event!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("text-xs", getEventTypeStyle(event.event_type))}>
                            {event.event_type || 'event'}
                          </Badge>
                          <span className="font-medium truncate">{event.title}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.start_date), 'MMM dd, yyyy - p')}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                        className="mt-2 sm:mt-0 self-end sm:self-center"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit_title">Title *</Label>
                    <Input id="edit_title" value={editEvent.title} onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="edit_start_date">Start Date</Label>
                      <Input id="edit_start_date" type="date" value={editEvent.start_date} onChange={(e) => setEditEvent({ ...editEvent, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="edit_end_date">End Date</Label>
                      <Input id="edit_end_date" type="date" value={editEvent.end_date} onChange={(e) => setEditEvent({ ...editEvent, end_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="edit_start_time">Start Time</Label>
                      <Input id="edit_start_time" type="time" value={editEvent.start_time} onChange={(e) => setEditEvent({ ...editEvent, start_time: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="edit_end_time">End Time</Label>
                      <Input id="edit_end_time" type="time" value={editEvent.end_time} onChange={(e) => setEditEvent({ ...editEvent, end_time: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit_location">Location</Label>
                    <Input id="edit_location" value={editEvent.location} onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit_description">Description</Label>
                    <Textarea id="edit_description" value={editEvent.description} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleUpdateEvent}>Save</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <></>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={startEditSelectedEvent}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {!isEditing && (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
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