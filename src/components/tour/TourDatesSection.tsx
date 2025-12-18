import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Clock, Music, Loader2, Plus, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TourEvent {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  event_type?: string;
}

type EventType = 'performance' | 'rehearsal' | 'travel' | 'free';

const getEventType = (title: string, description: string | null, eventType?: string): EventType => {
  if (eventType && ['performance', 'rehearsal', 'travel', 'free'].includes(eventType)) {
    return eventType as EventType;
  }
  const text = `${title} ${description || ''}`.toLowerCase();
  if (text.includes('travel') || text.includes('departure') || text.includes('arrival') || text.includes('bus') || text.includes('flight')) {
    return 'travel';
  }
  if (text.includes('rehearsal') || text.includes('practice') || text.includes('soundcheck') || text.includes('outreach')) {
    return 'rehearsal';
  }
  if (text.includes('free') || text.includes('off') || text.includes('sightseeing') || text.includes('rest')) {
    return 'free';
  }
  return 'performance';
};

const getTypeColor = (type: EventType) => {
  switch (type) {
    case 'performance': return 'bg-primary text-primary-foreground';
    case 'rehearsal': return 'bg-amber-500 text-white';
    case 'travel': return 'bg-blue-500 text-white';
    case 'free': return 'bg-emerald-500 text-white';
    default: return 'bg-muted';
  }
};

const getTypeLabel = (type: EventType) => {
  switch (type) {
    case 'performance': return 'Performance';
    case 'rehearsal': return 'Rehearsal';
    case 'travel': return 'Travel';
    case 'free': return 'Free Day';
    default: return type;
  }
};

interface AddDateFormProps {
  onSuccess: () => void;
  onClose: () => void;
  editingEvent?: TourEvent | null;
}

const AddDateForm = ({ onSuccess, onClose, editingEvent }: AddDateFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    location: editingEvent?.location || '',
    start_date: editingEvent?.start_date ? editingEvent.start_date.split('T')[0] : '',
    start_time: editingEvent?.start_date ? new Date(editingEvent.start_date).toTimeString().slice(0, 5) : '',
    end_date: editingEvent?.end_date ? editingEvent.end_date.split('T')[0] : '',
    end_time: editingEvent?.end_date ? new Date(editingEvent.end_date).toTimeString().slice(0, 5) : '',
    description: editingEvent?.description || '',
    event_type: editingEvent?.event_type || 'performance'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const startDateTime = formData.start_time 
        ? `${formData.start_date}T${formData.start_time}:00`
        : `${formData.start_date}T00:00:00`;
      
      const endDateTime = formData.end_date && formData.end_time
        ? `${formData.end_date}T${formData.end_time}:00`
        : formData.end_date 
          ? `${formData.end_date}T23:59:59`
          : null;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add tour dates",
          variant: "destructive"
        });
        return;
      }

      const eventData = {
        title: formData.title,
        location: formData.location,
        start_date: startDateTime,
        end_date: endDateTime,
        description: formData.description ? `[${formData.event_type}] ${formData.description}` : `[${formData.event_type}]`,
        created_by: user.id
      };

      if (editingEvent) {
        // Don't update created_by on edit
        const { created_by, ...updateData } = eventData;
        const { error } = await supabase
          .from('gw_tour_events')
          .update(updateData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast({ title: "Success", description: "Tour date updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_tour_events')
          .insert(eventData);

        if (error) throw error;
        toast({ title: "Success", description: "Tour date added successfully" });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving tour date:', error);
      toast({
        title: "Error",
        description: "Failed to save tour date",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Event Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Concert at Symphony Hall"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event_type">Event Type *</Label>
          <Select
            value={formData.event_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="rehearsal">Rehearsal</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="free">Free Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="e.g., Atlanta, GA"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Additional details about this event..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : editingEvent ? 'Update Date' : 'Add Date'}
        </Button>
      </div>
    </form>
  );
};

export const TourDatesSection = () => {
  const [tourEvents, setTourEvents] = useState<TourEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TourEvent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTourEvents();
  }, []);

  const fetchTourEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_tour_events')
        .select('id, title, location, start_date, end_date, description')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTourEvents(data || []);
    } catch (error) {
      console.error('Error fetching tour events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tour date?')) return;

    try {
      const { error } = await supabase
        .from('gw_tour_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Tour date deleted" });
      fetchTourEvents();
    } catch (error) {
      console.error('Error deleting tour date:', error);
      toast({
        title: "Error",
        description: "Failed to delete tour date",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (event: TourEvent) => {
    setEditingEvent(event);
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Performance
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Rehearsal
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Travel
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Free Day
          </Badge>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingEvent(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tour Date
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Tour Date' : 'Add New Tour Date'}
              </DialogTitle>
            </DialogHeader>
            <AddDateForm
              editingEvent={editingEvent}
              onSuccess={fetchTourEvents}
              onClose={() => {
                setIsAddDialogOpen(false);
                setEditingEvent(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {tourEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tour dates scheduled yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Click "Add Tour Date" to get started.</p>
          </Card>
        ) : (
          tourEvents.map((event) => {
            const eventType = getEventType(event.title, event.description, event.event_type);
            const startDate = new Date(event.start_date);
            
            return (
              <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                <div className="flex">
                  <div className={`w-2 ${getTypeColor(eventType)}`} />
                  <div className="flex-1 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(eventType)}>
                            {getTypeLabel(eventType)}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {startDate.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {startDate.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {eventType === 'performance' && (
                          <div className="flex items-center gap-2 mr-4">
                            <Music className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-primary">Concert</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
