import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Clock, Music, Loader2, Plus, Trash2, Edit, FileText, Building, DollarSign, User } from "lucide-react";
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
  host_name?: string;
  host_location?: string;
  host_signatory_name?: string;
  host_signatory_title?: string;
  host_department?: string;
  venue_name?: string;
  venue_address?: string;
  venue_contact?: string;
  venue_email?: string;
  venue_phone?: string;
  honorarium_amount?: number;
  deposit_amount?: number;
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
  onGenerateContract?: (event: TourEvent) => void;
}

const AddDateForm = ({ onSuccess, onClose, editingEvent, onGenerateContract }: AddDateFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    title: editingEvent?.title || '',
    location: editingEvent?.location || '',
    start_date: editingEvent?.start_date ? editingEvent.start_date.split('T')[0] : '',
    start_time: editingEvent?.start_date ? new Date(editingEvent.start_date).toTimeString().slice(0, 5) : '',
    end_date: editingEvent?.end_date ? editingEvent.end_date.split('T')[0] : '',
    end_time: editingEvent?.end_date ? new Date(editingEvent.end_date).toTimeString().slice(0, 5) : '',
    description: editingEvent?.description || '',
    event_type: editingEvent?.event_type || 'performance',
    // Host Info
    host_name: editingEvent?.host_name || '',
    host_location: editingEvent?.host_location || '',
    host_signatory_name: editingEvent?.host_signatory_name || '',
    host_signatory_title: editingEvent?.host_signatory_title || '',
    host_department: editingEvent?.host_department || '',
    // Venue Info
    venue_name: editingEvent?.venue_name || '',
    venue_address: editingEvent?.venue_address || '',
    venue_contact: editingEvent?.venue_contact || '',
    venue_email: editingEvent?.venue_email || '',
    venue_phone: editingEvent?.venue_phone || '',
    // Financial
    honorarium_amount: editingEvent?.honorarium_amount?.toString() || '5000',
    deposit_amount: editingEvent?.deposit_amount?.toString() || '2500'
  });

  // Auto-calculate deposit when honorarium changes
  const handleHonorariumChange = (value: string) => {
    const honorarium = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      honorarium_amount: value,
      deposit_amount: (honorarium / 2).toFixed(2)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add tour dates",
          variant: "destructive"
        });
        return;
      }

      const startDateTime = formData.start_time 
        ? `${formData.start_date}T${formData.start_time}:00`
        : `${formData.start_date}T00:00:00`;
      
      const endDateTime = formData.end_date && formData.end_time
        ? `${formData.end_date}T${formData.end_time}:00`
        : formData.end_date 
          ? `${formData.end_date}T23:59:59`
          : null;

      const eventData = {
        title: formData.title,
        location: formData.location,
        start_date: startDateTime,
        end_date: endDateTime,
        description: formData.description || null,
        event_type: formData.event_type,
        host_name: formData.host_name || null,
        host_location: formData.host_location || null,
        host_signatory_name: formData.host_signatory_name || null,
        host_signatory_title: formData.host_signatory_title || null,
        host_department: formData.host_department || null,
        venue_name: formData.venue_name || null,
        venue_address: formData.venue_address || null,
        venue_contact: formData.venue_contact || null,
        venue_email: formData.venue_email || null,
        venue_phone: formData.venue_phone || null,
        honorarium_amount: parseFloat(formData.honorarium_amount) || 0,
        deposit_amount: parseFloat(formData.deposit_amount) || 0,
        created_by: user.id
      };

      if (editingEvent) {
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="host" className="text-xs sm:text-sm">
            <Building className="h-4 w-4 mr-1 hidden sm:inline" />
            Host
          </TabsTrigger>
          <TabsTrigger value="venue" className="text-xs sm:text-sm">
            <MapPin className="h-4 w-4 mr-1 hidden sm:inline" />
            Venue
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
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
              <Label htmlFor="location">City/Location *</Label>
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
        </TabsContent>

        <TabsContent value="host" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Host organization information for contract generation</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host_name">Host Organization Name</Label>
              <Input
                id="host_name"
                value={formData.host_name}
                onChange={(e) => setFormData(prev => ({ ...prev, host_name: e.target.value }))}
                placeholder="e.g., Art Farm at Serenbe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host_location">Host Location</Label>
              <Input
                id="host_location"
                value={formData.host_location}
                onChange={(e) => setFormData(prev => ({ ...prev, host_location: e.target.value }))}
                placeholder="e.g., Palmetto, GA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host_signatory_name">Signatory Name</Label>
              <Input
                id="host_signatory_name"
                value={formData.host_signatory_name}
                onChange={(e) => setFormData(prev => ({ ...prev, host_signatory_name: e.target.value }))}
                placeholder="Person who will sign the contract"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host_signatory_title">Signatory Title</Label>
              <Input
                id="host_signatory_title"
                value={formData.host_signatory_title}
                onChange={(e) => setFormData(prev => ({ ...prev, host_signatory_title: e.target.value }))}
                placeholder="e.g., Event Director"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="host_department">Department</Label>
              <Input
                id="host_department"
                value={formData.host_department}
                onChange={(e) => setFormData(prev => ({ ...prev, host_department: e.target.value }))}
                placeholder="e.g., Special Events"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="venue" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Venue and contact details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue_name">Venue Name</Label>
              <Input
                id="venue_name"
                value={formData.venue_name}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                placeholder="e.g., Symphony Hall"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_contact">Contact Person</Label>
              <Input
                id="venue_contact"
                value={formData.venue_contact}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_contact: e.target.value }))}
                placeholder="Primary contact name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="venue_address">Venue Address</Label>
              <Textarea
                id="venue_address"
                value={formData.venue_address}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_address: e.target.value }))}
                placeholder="Full venue address"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_email">Contact Email</Label>
              <Input
                id="venue_email"
                type="email"
                value={formData.venue_email}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_email: e.target.value }))}
                placeholder="contact@venue.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_phone">Contact Phone</Label>
              <Input
                id="venue_phone"
                value={formData.venue_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Financial terms for the performance</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="honorarium_amount">Honorarium Amount ($)</Label>
              <Input
                id="honorarium_amount"
                type="number"
                step="0.01"
                value={formData.honorarium_amount}
                onChange={(e) => handleHonorariumChange(e.target.value)}
                placeholder="5000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit_amount">Deposit Amount (50%)</Label>
              <Input
                id="deposit_amount"
                value={`$${formData.deposit_amount}`}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {editingEvent && formData.host_name && onGenerateContract && (
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => onGenerateContract({
                ...editingEvent,
                ...formData,
                honorarium_amount: parseFloat(formData.honorarium_amount),
                deposit_amount: parseFloat(formData.deposit_amount)
              } as TourEvent)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Contract
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : editingEvent ? 'Update Date' : 'Add Date'}
          </Button>
        </div>
      </div>
    </form>
  );
};

interface TourDatesSectionProps {
  onGenerateContract?: (event: TourEvent) => void;
}

export const TourDatesSection = ({ onGenerateContract }: TourDatesSectionProps) => {
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
        .select('*')
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              onGenerateContract={onGenerateContract}
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
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {event.honorarium_amount && event.honorarium_amount > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {event.honorarium_amount.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                        {event.host_name && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Building className="h-3 w-3" />
                            Host: {event.host_name}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {eventType === 'performance' && (
                          <div className="flex items-center gap-2 mr-2">
                            <Music className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        {event.host_name && onGenerateContract && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => onGenerateContract(event)}
                          >
                            <FileText className="h-4 w-4" />
                            Contract
                          </Button>
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