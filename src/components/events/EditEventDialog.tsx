import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon, 
  EditIcon, 
  SaveIcon,
  ImageIcon,
  UploadIcon,
  XIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  image_url?: string;
}

interface EditEventDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

export const EditEventDialog = ({ event, open, onOpenChange, onEventUpdated }: EditEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    event_name: '',
    event_type: 'performance',
    event_date_start: '',
    event_date_end: '',
    location: '',
    expected_headcount: '',
    is_travel_involved: false,
    brief_description: '',
    approval_needed: false
  });

  const eventTypes = [
    { value: 'performance', label: 'Performance' },
    { value: 'rehearsal', label: 'Rehearsal' },
    { value: 'sectional', label: 'Sectional' },
    { value: 'member-meeting', label: 'Member Meeting' },
    { value: 'exec-meeting', label: 'Exec Board Meeting' },
    { value: 'voice-lesson', label: 'Voice Lesson' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'social', label: 'Social Event' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'audition', label: 'Audition' },
    { value: 'other', label: 'Other' }
  ];

  // Populate form data when event changes
  useEffect(() => {
    if (event) {
      const formatDateForInput = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
      };

      setFormData({
        title: event.title || '',
        event_name: event.event_name || '',
        event_type: event.event_type || 'performance',
        event_date_start: event.event_date_start ? formatDateForInput(event.event_date_start) : '',
        event_date_end: event.event_date_end ? formatDateForInput(event.event_date_end) : '',
        location: event.location || '',
        expected_headcount: event.expected_headcount?.toString() || '',
        is_travel_involved: event.is_travel_involved || false,
        brief_description: event.brief_description || '',
        approval_needed: event.approval_needed || false
      });

      // Set existing image if available
      setImagePreview(event.image_url || null);
      setImageFile(null);
    }
  }, [event]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `events/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !event) return;

    setLoading(true);
    try {
      let imageUrl = event.image_url; // Keep existing image by default

      // Upload new image if one was selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      } else if (imagePreview === null && event.image_url) {
        // Image was removed
        imageUrl = null;
      }

      const eventData = {
        title: formData.title,
        event_name: formData.event_name || null,
        event_type: formData.event_type,
        event_date_start: new Date(formData.event_date_start).toISOString(),
        event_date_end: formData.event_date_end ? new Date(formData.event_date_end).toISOString() : null,
        location: formData.location || null,
        expected_headcount: formData.expected_headcount ? parseInt(formData.expected_headcount) : null,
        is_travel_involved: formData.is_travel_involved,
        brief_description: formData.brief_description || null,
        approval_needed: formData.approval_needed,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully!",
      });

      onOpenChange(false);
      onEventUpdated();
    } catch (err) {
      console.error('Error updating event:', err);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EditIcon className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg">Edit Event</DialogTitle>
                <DialogDescription>
                  Update event details and settings
                </DialogDescription>
              </div>
            </div>
            <Badge className={getEventTypeColor(formData.event_type)}>
              {getEventTypeDisplay(formData.event_type)}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Fall Concert"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_name">Event Name</Label>
                  <Input
                    id="event_name"
                    value={formData.event_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
                    placeholder="Alternative event name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brief_description">Description</Label>
                <Textarea
                  id="brief_description"
                  value={formData.brief_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, brief_description: e.target.value }))}
                  placeholder="Event description..."
                  rows={3}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Event Image
                </Label>
                
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Event preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeImage}
                        className="gap-2"
                      >
                        <XIcon className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Add an event image
                      </p>
                      <Label
                        htmlFor="image-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer transition-colors"
                      >
                        <UploadIcon className="h-4 w-4" />
                        Choose Image
                      </Label>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date_start">Start Date & Time *</Label>
                  <Input
                    id="event_date_start"
                    type="datetime-local"
                    value={formData.event_date_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date_start: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_date_end">End Date & Time</Label>
                  <Input
                    id="event_date_end"
                    type="datetime-local"
                    value={formData.event_date_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date_end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Event location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_headcount">Expected Attendees</Label>
                  <Input
                    id="expected_headcount"
                    type="number"
                    value={formData.expected_headcount}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_headcount: e.target.value }))}
                    placeholder="Number of attendees"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_travel_involved"
                    checked={formData.is_travel_involved}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_travel_involved: checked }))}
                  />
                  <Label htmlFor="is_travel_involved">Travel involved</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="approval_needed"
                    checked={formData.approval_needed}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, approval_needed: checked }))}
                  />
                  <Label htmlFor="approval_needed">Requires approval</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <SaveIcon className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};