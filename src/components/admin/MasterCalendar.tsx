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
import { CalendarDays, Clock, MapPin, Users, Plus, Edit, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  type: 'rehearsal' | 'performance' | 'meeting' | 'blocked' | 'appointment';
  attendees?: number;
  status: 'scheduled' | 'confirmed' | 'cancelled';
}

export const MasterCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    description: '',
    type: 'rehearsal',
    status: 'scheduled'
  });

  // Sample events for demo
  useEffect(() => {
    const sampleEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Weekly Rehearsal',
        date: new Date(),
        startTime: '19:00',
        endTime: '21:00',
        location: 'Sisters Chapel',
        description: 'Regular weekly rehearsal',
        type: 'rehearsal',
        attendees: 45,
        status: 'confirmed'
      },
      {
        id: '2',
        title: 'Concert Performance',
        date: addDays(new Date(), 3),
        startTime: '20:00',
        endTime: '22:00',
        location: 'MLK Jr. International Chapel',
        description: 'Spring Concert',
        type: 'performance',
        attendees: 500,
        status: 'confirmed'
      },
      {
        id: '3',
        title: 'Block - Rehearsal Space Unavailable',
        date: addDays(new Date(), 1),
        startTime: '18:00',
        endTime: '22:00',
        location: 'Sisters Chapel',
        description: 'Space blocked for maintenance',
        type: 'blocked',
        status: 'confirmed'
      }
    ];
    setEvents(sampleEvents);
  }, []);

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      toast.error('Please fill in required fields');
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.startTime || '09:00',
      endTime: newEvent.endTime || '10:00',
      location: newEvent.location,
      description: newEvent.description,
      type: newEvent.type || 'rehearsal',
      attendees: newEvent.attendees,
      status: newEvent.status || 'scheduled'
    };

    setEvents([...events, event]);
    setNewEvent({
      title: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      description: '',
      type: 'rehearsal',
      status: 'scheduled'
    });
    setShowEventDialog(false);
    toast.success('Event created successfully');
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
    setSelectedEvent(null);
    toast.success('Event deleted successfully');
  };

  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case 'rehearsal':
        return 'bg-event-rehearsal text-event-rehearsal-fg border-event-rehearsal-fg/20';
      case 'performance':
        return 'bg-event-performance text-event-performance-fg border-event-performance-fg/20';
      case 'meeting':
        return 'bg-event-meeting text-event-meeting-fg border-event-meeting-fg/20';
      case 'blocked':
        return 'bg-status-cancelled text-status-cancelled-fg border-status-cancelled-fg/20';
      case 'appointment':
        return 'bg-event-voice-lesson text-event-voice-lesson-fg border-event-voice-lesson-fg/20';
      default:
        return 'bg-event-general text-event-general-fg border-event-general-fg/20';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-status-confirmed text-status-confirmed-fg';
      case 'cancelled':
        return 'bg-status-cancelled text-status-cancelled-fg';
      default:
        return 'bg-status-scheduled text-status-scheduled-fg';
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
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
                      getEventTypeStyle(event.type)
                    )}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-xs opacity-75">
                      {event.startTime} - {event.endTime}
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
              const eventHour = parseInt(event.startTime.split(':')[0]);
              return eventHour === hour;
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
                        getEventTypeStyle(event.type)
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm opacity-75">
                        {event.startTime} - {event.endTime}
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Master Calendar</h1>
          <p className="text-muted-foreground">
            Manage rehearsals, performances, and schedule blocks
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-border bg-background">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
          
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Event</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Add a new event or block time on the calendar
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-foreground">Title *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startTime" className="text-foreground">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-foreground">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="type" className="text-foreground">Event Type</Label>
                  <Select value={newEvent.type} onValueChange={(value) => setNewEvent({ ...newEvent, type: value as any })}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="rehearsal">Rehearsal</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="blocked">Block Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="location" className="text-foreground">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Event location"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event description"
                    className="bg-background border-border text-foreground"
                  />
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

      {/* Main Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mini Calendar */}
        <Card className="lg:col-span-1 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="w-full pointer-events-auto"
              modifiers={{
                hasEvents: events.map(e => e.date)
              }}
              modifiersStyles={{
                hasEvents: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: '4px'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Main View */}
        <div className="lg:col-span-3">
          {viewMode === 'month' && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">
                  {format(selectedDate, 'MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderWeekView()}
              </CardContent>
            </Card>
          )}
          
          {viewMode === 'week' && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">
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

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{selectedEvent.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {format(selectedEvent.date, 'EEEE, MMMM dd, yyyy')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getEventTypeStyle(selectedEvent.type)}>
                  {selectedEvent.type}
                </Badge>
                <Badge className={getStatusStyle(selectedEvent.status)}>
                  {selectedEvent.status}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4" />
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </div>
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.location}
                  </div>
                )}
                
                {selectedEvent.attendees && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4" />
                    {selectedEvent.attendees} attendees
                  </div>
                )}
              </div>
              
              {selectedEvent.description && (
                <div>
                  <Label className="text-foreground">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
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
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-xl font-bold text-card-foreground">
                  {events.filter(e => {
                    const start = startOfWeek(new Date());
                    const end = addDays(start, 6);
                    return e.date >= start && e.date <= end;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-status-cancelled-fg" />
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-xl font-bold text-card-foreground">
                  {events.filter(e => e.type === 'blocked').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-event-performance-fg" />
              <div>
                <p className="text-sm text-muted-foreground">Performances</p>
                <p className="text-xl font-bold text-card-foreground">
                  {events.filter(e => e.type === 'performance').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-event-rehearsal-fg" />
              <div>
                <p className="text-sm text-muted-foreground">Rehearsals</p>
                <p className="text-xl font-bold text-card-foreground">
                  {events.filter(e => e.type === 'rehearsal').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};