import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  MapPin,
  Calendar,
  Users,
  Plane,
  Car,
  Train,
  Bus,
  Hotel,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TourEvent {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  venue_contact: string | null;
  venue_phone: string | null;
  venue_email: string | null;
  setlist_id: string | null;
  budget_allocated: number | null;
  created_at: string;
}

interface TourTask {
  id: string;
  event_id: string;
  task_type: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  priority: string;
  created_at: string;
  assignee?: any;
}

interface TravelLog {
  id: string;
  event_id: string;
  person_id: string;
  travel_mode: string;
  departure_location: string | null;
  departure_time: string | null;
  arrival_location: string | null;
  arrival_time: string | null;
  cost: number | null;
  confirmed: boolean;
  booking_reference: string | null;
  notes: string | null;
  person?: any;
}

export const TourManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<TourEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TourEvent | null>(null);
  const [tasks, setTasks] = useState<TourTask[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTravelOpen, setCreateTravelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    venue_contact: '',
    venue_phone: '',
    venue_email: '',
    budget_allocated: ''
  });

  const [newTask, setNewTask] = useState({
    task_type: 'other',
    title: '',
    description: '',
    assignee_id: '',
    due_date: '',
    priority: 'medium'
  });

  const [newTravel, setNewTravel] = useState({
    person_id: '',
    travel_mode: 'bus',
    departure_location: '',
    departure_time: '',
    arrival_location: '',
    arrival_time: '',
    cost: '',
    booking_reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTasks(selectedEvent.id);
      fetchTravelLogs(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_tour_events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tour events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_tour_tasks')
        .select(`
          *,
          assignee:gw_profiles(full_name, email)
        `)
        .eq('event_id', eventId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTravelLogs = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_travel_logs')
        .select(`
          *,
          person:gw_profiles(full_name, email)
        `)
        .eq('event_id', eventId)
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setTravelLogs(data || []);
    } catch (error) {
      console.error('Error fetching travel logs:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.location || !newEvent.start_date) {
      toast({
        title: 'Error',
        description: 'Title, location, and start date are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_tour_events')
        .insert({
          title: newEvent.title,
          location: newEvent.location,
          start_date: newEvent.start_date,
          end_date: newEvent.end_date || null,
          description: newEvent.description || null,
          venue_contact: newEvent.venue_contact || null,
          venue_phone: newEvent.venue_phone || null,
          venue_email: newEvent.venue_email || null,
          budget_allocated: newEvent.budget_allocated ? parseFloat(newEvent.budget_allocated) : null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setEvents([data, ...events]);
      setNewEvent({
        title: '',
        location: '',
        start_date: '',
        end_date: '',
        description: '',
        venue_contact: '',
        venue_phone: '',
        venue_email: '',
        budget_allocated: ''
      });
      setCreateEventOpen(false);
      
      toast({
        title: 'Success',
        description: 'Tour event created successfully'
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tour event',
        variant: 'destructive'
      });
    }
  };

  const createTask = async () => {
    if (!selectedEvent || !newTask.title) {
      toast({
        title: 'Error',
        description: 'Task title is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_tour_tasks')
        .insert({
          event_id: selectedEvent.id,
          task_type: newTask.task_type,
          title: newTask.title,
          description: newTask.description || null,
          assignee_id: newTask.assignee_id || null,
          due_date: newTask.due_date || null,
          priority: newTask.priority
        })
        .select(`
          *,
          assignee:gw_profiles(full_name, email)
        `)
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);
      setNewTask({
        task_type: 'other',
        title: '',
        description: '',
        assignee_id: '',
        due_date: '',
        priority: 'medium'
      });
      setCreateTaskOpen(false);
      
      toast({
        title: 'Success',
        description: 'Task created successfully'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive'
      });
    }
  };

  const toggleTaskComplete = async (task: TourTask) => {
    try {
      const { error } = await supabase
        .from('gw_tour_tasks')
        .update({ 
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      setTasks(tasks.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              completed: !t.completed,
              completed_at: !t.completed ? new Date().toISOString() : null
            }
          : t
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const createTravelLog = async () => {
    if (!selectedEvent || !newTravel.person_id) {
      toast({
        title: 'Error',
        description: 'Person must be selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_travel_logs')
        .insert({
          event_id: selectedEvent.id,
          person_id: newTravel.person_id,
          travel_mode: newTravel.travel_mode,
          departure_location: newTravel.departure_location || null,
          departure_time: newTravel.departure_time || null,
          arrival_location: newTravel.arrival_location || null,
          arrival_time: newTravel.arrival_time || null,
          cost: newTravel.cost ? parseFloat(newTravel.cost) : null,
          booking_reference: newTravel.booking_reference || null,
          notes: newTravel.notes || null
        })
        .select(`
          *,
          person:gw_profiles(full_name, email)
        `)
        .single();

      if (error) throw error;

      setTravelLogs([...travelLogs, data]);
      setNewTravel({
        person_id: '',
        travel_mode: 'bus',
        departure_location: '',
        departure_time: '',
        arrival_location: '',
        arrival_time: '',
        cost: '',
        booking_reference: '',
        notes: ''
      });
      setCreateTravelOpen(false);
      
      toast({
        title: 'Success',
        description: 'Travel entry created successfully'
      });
    } catch (error) {
      console.error('Error creating travel log:', error);
      toast({
        title: 'Error',
        description: 'Failed to create travel entry',
        variant: 'destructive'
      });
    }
  };

  const getTravelIcon = (mode: string) => {
    switch (mode) {
      case 'plane': return <Plane className="h-4 w-4" />;
      case 'car': return <Car className="h-4 w-4" />;
      case 'train': return <Train className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tour data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tour Manager</h2>
          <p className="text-muted-foreground">Manage tour events, tasks, and travel logistics</p>
        </div>
        
        <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Tour Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Tour Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="e.g., Syracuse Jazz Festival"
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="e.g., Syracuse, NY"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({...newEvent, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({...newEvent, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="budget_allocated">Budget Allocated</Label>
                <Input
                  id="budget_allocated"
                  type="number"
                  step="0.01"
                  value={newEvent.budget_allocated}
                  onChange={(e) => setNewEvent({...newEvent, budget_allocated: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Event description..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createEvent} className="flex-1">
                  Create Event
                </Button>
                <Button variant="outline" onClick={() => setCreateEventOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Tour Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedEvent?.id === event.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <h4 className="font-medium text-sm">{event.title}</h4>
                <p className="text-xs text-muted-foreground mb-1">{event.location}</p>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.start_date).toLocaleDateString()}
                  </span>
                </div>
                {event.budget_allocated && (
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      ${event.budget_allocated.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Event Details */}
        {selectedEvent && (
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedEvent.title}</CardTitle>
                    <p className="text-muted-foreground">{selectedEvent.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export Packet
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tasks" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="travel">Travel</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="tasks" className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Event Tasks</h3>
                      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Task</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="task_type">Task Type</Label>
                              <Select value={newTask.task_type} onValueChange={(value) => setNewTask({...newTask, task_type: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="travel">Travel</SelectItem>
                                  <SelectItem value="accommodation">Accommodation</SelectItem>
                                  <SelectItem value="meals">Meals</SelectItem>
                                  <SelectItem value="rehearsal">Rehearsal</SelectItem>
                                  <SelectItem value="setup">Setup</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="task_title">Title *</Label>
                              <Input
                                id="task_title"
                                value={newTask.title}
                                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                placeholder="Task title"
                              />
                            </div>
                            <div>
                              <Label htmlFor="assignee">Assignee</Label>
                              <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({...newTask, assignee_id: value})}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers.map((member) => (
                                    <SelectItem key={member.user_id} value={member.user_id}>
                                      {member.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="due_date">Due Date</Label>
                              <Input
                                id="due_date"
                                type="datetime-local"
                                value={newTask.due_date}
                                onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="priority">Priority</Label>
                              <Select value={newTask.priority} onValueChange={(value) => setNewTask({...newTask, priority: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="task_description">Description</Label>
                              <Textarea
                                id="task_description"
                                value={newTask.description}
                                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                placeholder="Task description..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={createTask} className="flex-1">
                                Create Task
                              </Button>
                              <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskComplete(task)}
                          >
                            <CheckCircle className={`h-4 w-4 ${task.completed ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {task.task_type}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            {task.assignee && (
                              <p className="text-xs text-muted-foreground">Assigned to: {task.assignee.full_name}</p>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="travel" className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Travel Arrangements</h3>
                      <Dialog open={createTravelOpen} onOpenChange={setCreateTravelOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Travel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Travel Entry</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="person">Person *</Label>
                              <Select value={newTravel.person_id} onValueChange={(value) => setNewTravel({...newTravel, person_id: value})}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select person" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers.map((member) => (
                                    <SelectItem key={member.user_id} value={member.user_id}>
                                      {member.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="travel_mode">Travel Mode</Label>
                              <Select value={newTravel.travel_mode} onValueChange={(value) => setNewTravel({...newTravel, travel_mode: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bus">Bus</SelectItem>
                                  <SelectItem value="plane">Plane</SelectItem>
                                  <SelectItem value="car">Car</SelectItem>
                                  <SelectItem value="train">Train</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="departure_location">Departure</Label>
                                <Input
                                  id="departure_location"
                                  value={newTravel.departure_location}
                                  onChange={(e) => setNewTravel({...newTravel, departure_location: e.target.value})}
                                  placeholder="Departure location"
                                />
                              </div>
                              <div>
                                <Label htmlFor="arrival_location">Arrival</Label>
                                <Input
                                  id="arrival_location"
                                  value={newTravel.arrival_location}
                                  onChange={(e) => setNewTravel({...newTravel, arrival_location: e.target.value})}
                                  placeholder="Arrival location"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="departure_time">Departure Time</Label>
                                <Input
                                  id="departure_time"
                                  type="datetime-local"
                                  value={newTravel.departure_time}
                                  onChange={(e) => setNewTravel({...newTravel, departure_time: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="arrival_time">Arrival Time</Label>
                                <Input
                                  id="arrival_time"
                                  type="datetime-local"
                                  value={newTravel.arrival_time}
                                  onChange={(e) => setNewTravel({...newTravel, arrival_time: e.target.value})}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="cost">Cost</Label>
                              <Input
                                id="cost"
                                type="number"
                                step="0.01"
                                value={newTravel.cost}
                                onChange={(e) => setNewTravel({...newTravel, cost: e.target.value})}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label htmlFor="booking_reference">Booking Reference</Label>
                              <Input
                                id="booking_reference"
                                value={newTravel.booking_reference}
                                onChange={(e) => setNewTravel({...newTravel, booking_reference: e.target.value})}
                                placeholder="Confirmation number"
                              />
                            </div>
                            <div>
                              <Label htmlFor="travel_notes">Notes</Label>
                              <Textarea
                                id="travel_notes"
                                value={newTravel.notes}
                                onChange={(e) => setNewTravel({...newTravel, notes: e.target.value})}
                                placeholder="Additional notes..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={createTravelLog} className="flex-1">
                                Add Travel Entry
                              </Button>
                              <Button variant="outline" onClick={() => setCreateTravelOpen(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-3">
                      {travelLogs.map((log) => (
                        <div key={log.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getTravelIcon(log.travel_mode)}
                            <h4 className="font-medium">{log.person?.full_name}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {log.travel_mode}
                            </Badge>
                            {log.confirmed && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                Confirmed
                              </Badge>
                            )}
                          </div>
                          {(log.departure_location || log.arrival_location) && (
                            <p className="text-sm text-muted-foreground">
                              {log.departure_location} → {log.arrival_location}
                            </p>
                          )}
                          {(log.departure_time || log.arrival_time) && (
                            <p className="text-xs text-muted-foreground">
                              {log.departure_time && new Date(log.departure_time).toLocaleDateString()} - {log.arrival_time && new Date(log.arrival_time).toLocaleDateString()}
                            </p>
                          )}
                          {log.cost && (
                            <p className="text-xs text-muted-foreground">Cost: ${log.cost.toFixed(2)}</p>
                          )}
                          {log.booking_reference && (
                            <p className="text-xs text-muted-foreground">Reference: {log.booking_reference}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="details" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Event Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Location:</strong> {selectedEvent.location}
                          </div>
                          <div>
                            <strong>Start Date:</strong> {new Date(selectedEvent.start_date).toLocaleDateString()}
                          </div>
                          {selectedEvent.end_date && (
                            <div>
                              <strong>End Date:</strong> {new Date(selectedEvent.end_date).toLocaleDateString()}
                            </div>
                          )}
                          {selectedEvent.budget_allocated && (
                            <div>
                              <strong>Budget:</strong> ${selectedEvent.budget_allocated.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedEvent.description && (
                        <div>
                          <h3 className="font-semibold mb-2">Description</h3>
                          <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                        </div>
                      )}
                      
                      {(selectedEvent.venue_contact || selectedEvent.venue_phone || selectedEvent.venue_email) && (
                        <div>
                          <h3 className="font-semibold mb-2">Venue Contact</h3>
                          <div className="space-y-1 text-sm">
                            {selectedEvent.venue_contact && (
                              <p><strong>Contact:</strong> {selectedEvent.venue_contact}</p>
                            )}
                            {selectedEvent.venue_phone && (
                              <p><strong>Phone:</strong> {selectedEvent.venue_phone}</p>
                            )}
                            {selectedEvent.venue_email && (
                              <p><strong>Email:</strong> {selectedEvent.venue_email}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};