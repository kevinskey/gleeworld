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
import { Separator } from "@/components/ui/separator";
import { AddressInput } from "@/components/shared/AddressInput";
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  UsersIcon, 
  EditIcon, 
  SaveIcon, 
  XIcon,
  TrashIcon,
  AlertTriangleIcon,
  ImageIcon,
  UploadIcon
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EditEventDialogProps {
  event: GleeWorldEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

export const EditEventDialog = ({ event, open, onOpenChange, onEventUpdated }: EditEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    is_public: true,
    status: 'scheduled',
    attendance_required: false,
    attendance_deadline: '',
    late_arrival_allowed: true,
    excuse_required: false
  });

  // Helper function to calculate attendance deadline (30 minutes after start)
  const calculateAttendanceDeadline = (startDate: string) => {
    if (!startDate) return '';
    const start = new Date(startDate + ':00');
    const deadline = new Date(start.getTime() + 30 * 60000); // Add 30 minutes
    return deadline.toISOString().slice(0, 16);
  };

  const eventTypes = [
    { value: 'performance', label: 'Performance', color: 'bg-event-performance text-event-performance-fg' },
    { value: 'rehearsal', label: 'Rehearsal', color: 'bg-event-rehearsal text-event-rehearsal-fg' },
    { value: 'sectional', label: 'Sectional', color: 'bg-event-sectional text-event-sectional-fg' },
    { value: 'member-meeting', label: 'Member Meeting', color: 'bg-event-member-meeting text-event-member-meeting-fg' },
    { value: 'exec-meeting', label: 'Exec Board Meeting', color: 'bg-event-exec-meeting text-event-exec-meeting-fg' },
    { value: 'voice-lesson', label: 'Voice Lesson', color: 'bg-event-voice-lesson text-event-voice-lesson-fg' },
    { value: 'tutorial', label: 'Tutorial', color: 'bg-event-tutorial text-event-tutorial-fg' },
    { value: 'social', label: 'Social Event', color: 'bg-event-social text-event-social-fg' },
    { value: 'meeting', label: 'Meeting', color: 'bg-event-meeting text-event-meeting-fg' },
    { value: 'workshop', label: 'Workshop', color: 'bg-event-workshop text-event-workshop-fg' },
    { value: 'audition', label: 'Audition', color: 'bg-event-audition text-event-audition-fg' },
    { value: 'other', label: 'Other', color: 'bg-event-general text-event-general-fg' }
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    { value: 'postponed', label: 'Postponed', color: 'bg-yellow-100 text-yellow-800' }
  ];

  // Populate form data when event changes
  useEffect(() => {
    if (event) {
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    // Convert from UTC to local time for the datetime-local input
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  };

      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_type: event.event_type || 'performance',
        start_date: formatDateForInput(event.start_date),
        end_date: event.end_date ? formatDateForInput(event.end_date) : '',
        venue_name: event.venue_name || '',
        address: event.address || '',
        max_attendees: event.max_attendees?.toString() || '',
        registration_required: event.registration_required || false,
        is_public: event.is_public !== false,
        status: event.status || 'scheduled',
        attendance_required: event.attendance_required || false,
        attendance_deadline: event.attendance_deadline ? formatDateForInput(event.attendance_deadline) : '',
        late_arrival_allowed: event.late_arrival_allowed !== false,
        excuse_required: event.excuse_required || false
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
        // Image was removed, delete from storage if it exists
        if (event.image_url) {
          const urlParts = event.image_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabase.storage
            .from('event-images')
            .remove([`events/${fileName}`]);
        }
        imageUrl = null;
      }

      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_date: formData.start_date ? new Date(formData.start_date + ':00').toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date + ':00').toISOString() : null,
        location: null,
        venue_name: formData.venue_name || null,
        address: formData.address || null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_required: formData.registration_required,
        is_public: formData.is_public,
        status: formData.status,
        image_url: imageUrl,
        attendance_required: formData.attendance_required,
        attendance_deadline: formData.attendance_deadline ? new Date(formData.attendance_deadline + ':00').toISOString() : null,
        late_arrival_allowed: formData.late_arrival_allowed,
        excuse_required: formData.excuse_required,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('gw_events')
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

  const handleDelete = async () => {
    if (!event) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully!",
      });

      onOpenChange(false);
      onEventUpdated();
    } catch (err) {
      console.error('Error deleting event:', err);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    return eventTypes.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-blue-100 text-blue-800';
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <EditIcon className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg sm:text-xl">Edit Event</DialogTitle>
                <DialogDescription>
                  Update event details and settings
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getEventTypeColor(formData.event_type)}>
                {eventTypes.find(t => t.value === formData.event_type)?.label}
              </Badge>
              <Badge className={getStatusColor(formData.status)}>
                {statusOptions.find(s => s.value === formData.status)?.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Overview Card */}
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
                  <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Fall Concert"
                    required
                    className="animate-fade-in"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_type" className="text-sm font-medium">Event Type</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
                  >
                    <SelectTrigger className="animate-fade-in">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${type.color.split(' ')[0]}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description..."
                  rows={3}
                  className="animate-fade-in resize-none"
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
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
                        Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Add an event image to make it more appealing
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
                
                {imagePreview && (
                  <div className="flex justify-center">
                    <Label
                      htmlFor="image-upload-replace"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 cursor-pointer transition-colors"
                    >
                      <UploadIcon className="h-3 w-3" />
                      Change Image
                    </Label>
                    <Input
                      id="image-upload-replace"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-sm font-medium">Start Date & Time *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        start_date: newStartDate,
                        attendance_deadline: prev.attendance_required && newStartDate ? calculateAttendanceDeadline(newStartDate) : prev.attendance_deadline
                      }));
                    }}
                    required
                    className="animate-fade-in"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-sm font-medium">End Date & Time</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="animate-fade-in"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="animate-fade-in">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPinIcon className="h-4 w-4" />
                Location & Venue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue_name" className="text-sm font-medium">Venue Name</Label>
                <Input
                  id="venue_name"
                  value={formData.venue_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                  placeholder="e.g., Memorial Auditorium"
                  className="animate-fade-in"
                />
              </div>

              <AddressInput
                id="address"
                label="Full Address"
                value={formData.address}
                onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                placeholder="Complete street address"
                className="animate-fade-in"
                onPlaceSelect={(place) => {
                  if (place.formatted_address) {
                    setFormData(prev => ({ ...prev, address: place.formatted_address || '' }));
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Event Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="max_attendees" className="text-sm font-medium">Maximum Attendees</Label>
                <Input
                  id="max_attendees"
                  type="number"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                  className="animate-fade-in max-w-xs"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Registration Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Attendees must register before attending this event
                    </p>
                  </div>
                  <Switch
                    checked={formData.registration_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, registration_required: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Public Event</Label>
                    <p className="text-xs text-muted-foreground">
                      Event will be visible to all visitors and on the public calendar
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Attendance Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Should members be required to mark attendance for this event?
                    </p>
                  </div>
                  <Switch
                    checked={formData.attendance_required}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        attendance_required: checked,
                        attendance_deadline: checked && prev.start_date ? calculateAttendanceDeadline(prev.start_date) : prev.attendance_deadline
                      }));
                    }}
                  />
                </div>

                {formData.attendance_required && (
                  <div className="space-y-4 p-4 border rounded-lg bg-background">
                    <div className="space-y-2">
                      <Label htmlFor="attendance_deadline" className="text-sm font-medium">
                        Attendance Deadline
                        <span className="text-xs text-muted-foreground ml-2">(Automatically set to 30 minutes after start)</span>
                      </Label>
                      <Input
                        id="attendance_deadline"
                        type="datetime-local"
                        value={formData.attendance_deadline}
                        onChange={(e) => setFormData(prev => ({ ...prev, attendance_deadline: e.target.value }))}
                        placeholder="When must attendance be marked?"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Allow Late Arrivals</Label>
                        <p className="text-xs text-muted-foreground">
                          Can members mark attendance after the event starts?
                        </p>
                      </div>
                      <Switch
                        checked={formData.late_arrival_allowed}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, late_arrival_allowed: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Excuse Required for Absence</Label>
                        <p className="text-xs text-muted-foreground">
                          Must members provide an excuse if they miss this event?
                        </p>
                      </div>
                      <Switch
                        checked={formData.excuse_required}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, excuse_required: checked }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="w-full sm:w-auto">
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-5 w-5 text-destructive" />
                    Delete Event
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{event.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteLoading ? "Deleting..." : "Delete Event"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                <XIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="hover-scale w-full sm:w-auto">
                <SaveIcon className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};