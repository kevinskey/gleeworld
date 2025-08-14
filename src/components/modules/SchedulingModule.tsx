import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Calendar, Users, MapPin, Plus, Edit, Trash2, Settings, AlertCircle } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAppointments } from "@/hooks/useAppointments";
import { useState, useEffect } from "react";
import { format, isToday, isThisWeek, addDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const SchedulingModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { events, loading: eventsLoading, fetchEvents } = useGleeWorldEvents();
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '19:30',
    location: '',
    event_type: 'rehearsal',
    is_public: true,
    registration_required: false,
  });

  // Calculate stats from real data
  const currentDate = new Date();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thisWeekEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    return eventDate >= weekStart && eventDate < weekEnd;
  });

  const totalHours = thisWeekEvents.reduce((acc, event) => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date || event.start_date);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return acc + duration;
  }, 0);

  const upcomingEvents = events
    .filter(event => new Date(event.start_date) > currentDate)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5);

  // Mock attendance rate - in real implementation, get from attendance data
  const attendanceRate = 94;
  const managedRooms = 8;

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Event title is required');
      return;
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('You must be logged in to create events');
        return;
      }

      // Get default calendar ID
      const { data: calendar } = await supabase
        .from('gw_calendars')
        .select('id')
        .eq('is_default', true)
        .single();

      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description?.trim() || null,
        event_type: newEvent.event_type,
        start_date: `${newEvent.start_date}T${newEvent.start_time}:00`,
        end_date: `${newEvent.end_date}T${newEvent.end_time}:00`,
        location: newEvent.location?.trim() || null,
        is_public: newEvent.is_public,
        registration_required: newEvent.registration_required,
        calendar_id: calendar?.id,
        created_by: currentUser.id,
        status: 'scheduled'
      };

      const { error } = await supabase
        .from('gw_events')
        .insert([eventData]);

      if (error) throw error;

      toast.success('Event created successfully');
      setShowCreateDialog(false);
      setNewEvent({
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        start_time: '18:00',
        end_time: '19:30',
        location: '',
        event_type: 'rehearsal',
        is_public: true,
        registration_required: false,
      });
      fetchEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error?.message || 'Failed to create event');
    }
  };

  if (isFullPage) {
    return (
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">Scheduling Dashboard</h1>
            <p className="text-muted-foreground">Manage rehearsals, events, and appointments</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
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
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event description"
                    rows={2}
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Event location"
                  />
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
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{thisWeekEvents.length}</div>
              <div className="text-sm text-muted-foreground">Events This Week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{Math.round(totalHours)}</div>
              <div className="text-sm text-muted-foreground">Total Hours Scheduled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{attendanceRate}%</div>
              <div className="text-sm text-muted-foreground">Attendance Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{managedRooms}</div>
              <div className="text-sm text-muted-foreground">Rooms Managed</div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Upcoming Events</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('calendar')}>
                  View Calendar
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="h-5 w-5 bg-muted rounded" />
                      <div className="space-y-2">
                        <div className="h-4 w-48 bg-muted rounded" />
                        <div className="h-3 w-72 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming events scheduled</p>
                <Button variant="outline" className="mt-2" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Event
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => {
                  const eventDate = new Date(event.start_date);
                  const endDate = event.end_date ? new Date(event.end_date) : null;
                  
                  return (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-2 w-2 rounded-full ${
                          event.event_type === 'rehearsal' ? 'bg-primary' :
                          event.event_type === 'performance' ? 'bg-emerald-500' :
                          event.event_type === 'meeting' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div>
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(eventDate, 'MMM dd')} at {format(eventDate, 'h:mm a')}
                              {endDate && ` - ${format(endDate, 'h:mm a')}`}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={isToday(eventDate) ? 'default' : 'secondary'}>
                          {isToday(eventDate) ? 'Today' : 
                           isThisWeek(eventDate) ? 'This Week' : 'Upcoming'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional section for appointments if user has access */}
        {appointments && appointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments.slice(0, 3).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Appointment #{appointment.id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.appointment_date), 'MMM dd, yyyy')} at {appointment.start_time}
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      appointment.status === 'confirmed' ? 'default' :
                      appointment.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const nextEvent = upcomingEvents[0];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduling
        </CardTitle>
        <CardDescription>Manage rehearsals and events</CardDescription>
      </CardHeader>
      <CardContent>
        {eventsLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm flex items-center justify-between">
              <span>{thisWeekEvents.length} events this week</span>
              <Badge variant="outline">{Math.round(totalHours)}h total</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {attendanceRate}% attendance rate
            </div>
            {nextEvent ? (
              <div className="text-sm p-2 bg-muted/50 rounded-lg">
                <div className="font-medium">Next: {nextEvent.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(nextEvent.start_date), 'MMM dd')} at {format(new Date(nextEvent.start_date), 'h:mm a')}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No upcoming events</div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onNavigate?.('scheduling')}
            >
              View Full Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};