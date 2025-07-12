import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles, Send, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AddressInput } from "@/components/shared/AddressInput";
import { UserPicker } from "./UserPicker";

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

export const CreateEventDialog = ({ onEventCreated }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'performance',
    start_date: '',
    end_date: '',
    venue_name: '',
    address: '',
    max_attendees: '',
    registration_required: false,
    is_public: true
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const eventTypes = [
    { value: 'performance', label: 'Performance' },
    { value: 'rehearsal', label: 'Rehearsal' },
    { value: 'sectionals', label: 'Sectionals' },
    { value: 'social', label: 'Social Event' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'audition', label: 'Audition' },
    { value: 'other', label: 'Other' }
  ];

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
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const uploadImage = async (file: File, eventId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const generateDescription = async () => {
    if (!formData.title) {
      toast({
        title: "Missing Information",
        description: "Please enter an event title first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-event-description', {
        body: {
          title: formData.title,
          eventType: formData.event_type,
          venue: formData.venue_name,
          maxAttendees: formData.max_attendees
        }
      });

      if (error) throw error;

      setFormData(prev => ({ ...prev, description: data.description }));
      toast({
        title: "Success",
        description: "AI-generated description added!",
      });
    } catch (err) {
      console.error('Error generating description:', err);
      toast({
        title: "Error",
        description: "Failed to generate description",
        variant: "destructive",
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        location: null,
        venue_name: formData.venue_name || null,
        address: formData.address || null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_required: formData.registration_required,
        is_public: formData.is_public,
        created_by: user.id,
        status: 'scheduled'
      };

      const { data: newEvent, error } = await supabase
        .from('gw_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Upload image if selected
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, newEvent.id);
        if (imageUrl) {
          // Update the event with the image URL
          await supabase
            .from('events')
            .update({ image_url: imageUrl })
            .eq('id', newEvent.id);
        }
      }

      // Send notifications if users are selected
      if (selectedUserIds.length > 0) {
        try {
          await supabase.functions.invoke('send-event-notifications', {
            body: {
              eventId: newEvent.id,
              eventTitle: formData.title,
              eventDate: formData.start_date,
              userIds: selectedUserIds,
              message: notificationMessage
            }
          });
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
          // Don't fail the event creation if notifications fail
        }
      }

      toast({
        title: "Success",
        description: `Event created successfully!${selectedUserIds.length > 0 ? ` Notifications sent to ${selectedUserIds.length} user(s).` : ''}`,
      });

      setOpen(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'performance',
        start_date: '',
        end_date: '',
        venue_name: '',
        address: '',
        max_attendees: '',
        registration_required: false,
        is_public: true
      });
      setSelectedUserIds([]);
      setNotificationMessage('');
      setImageFile(null);
      setImagePreview('');
      onEventCreated();
    } catch (err) {
      console.error('Error creating event:', err);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event to the Glee World calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateDescription}
                  disabled={generatingDescription || !formData.title}
                  className="h-8"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {generatingDescription ? "Generating..." : "AI Generate"}
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description... (or use AI Generate)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label htmlFor="max_attendees">Max Attendees</Label>
                <Input
                  id="max_attendees"
                  type="number"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date & Time *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date & Time</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_name">Venue Name</Label>
              <Input
                id="venue_name"
                value={formData.venue_name}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                placeholder="e.g., Memorial Auditorium"
              />
            </div>

            <AddressInput
              id="address"
              label="Full Address"
              value={formData.address}
              onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
              placeholder="Complete street address"
              onPlaceSelect={(place) => {
                if (place.formatted_address) {
                  setFormData(prev => ({ ...prev, address: place.formatted_address || '' }));
                }
              }}
            />

            <div className="space-y-2">
              <Label htmlFor="event_image">Event Image</Label>
              <div className="space-y-2">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Event preview"
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload an event image to display on the landing page
                    </p>
                    <Input
                      id="event_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('event_image')?.click()}
                    >
                      Choose Image
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 5MB. Supported formats: JPG, PNG, WebP
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Registration Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Do attendees need to register for this event?
                  </p>
                </div>
                <Switch
                  checked={formData.registration_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, registration_required: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Event</Label>
                  <p className="text-sm text-muted-foreground">
                    Should this event be visible to the public?
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Notify Users
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select users to notify about this event
                </p>
                <UserPicker
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                />
              </div>

              {selectedUserIds.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="notificationMessage">Custom Message (Optional)</Label>
                  <Textarea
                    id="notificationMessage"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Add a personal message to the notification..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};