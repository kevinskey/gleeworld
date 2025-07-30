import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Repeat, DollarSign, Users, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMergedProfile } from "@/hooks/useMergedProfile";

interface CreateEventDialogProps {
  onEventCreated?: () => void;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
}

interface ImageUpload {
  file: File;
  preview: string;
  uploaded?: boolean;
  url?: string;
}

export const CreateEventDialog = ({ onEventCreated }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile } = useMergedProfile(user);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [formData, setFormData] = useState({
    calendar_id: '',
    event_type: 'performance',
    title: '',
    event_date_start: '',
    event_date_end: '',
    location: '',
    is_travel_involved: false,
    no_sing_rest_required: false,
    no_sing_rest_date_start: '',
    no_sing_rest_date_end: '',
    brief_description: '',
    approval_needed: false,
    is_recurring: false,
    recurring_frequency: 'weekly',
    recurring_days: ['monday', 'wednesday', 'friday'],
    recurring_end_date: '',
    recurring_end_type: 'date'
  });

  // Load calendars when dialog opens
  const loadCalendars = async () => {
    const { data, error } = await supabase
      .from('gw_calendars')
      .select('id, name, color')
      .eq('is_visible', true)
      .order('is_default', { ascending: false })
      .order('created_at');
    
    if (data) {
      setCalendars(data);
      if (data.length > 0 && !formData.calendar_id) {
        setFormData(prev => ({ ...prev, calendar_id: data[0].id }));
      }
    }
  };

  // Check if user is executive board member
  const isExecBoardMember = profile?.exec_board_role && profile.exec_board_role.trim() !== '';
  const isTourManagerOrAdmin = profile?.role === 'super-admin' || 
                               profile?.role === 'admin' || 
                               profile?.exec_board_role?.toLowerCase().includes('tour');

  const eventTypes = [
    { 
      value: 'performance', 
      label: 'Performance',
      requiresBudget: false,
      requiresContract: true,
      description: 'Managed by tour manager/admin with contracts'
    },
    { 
      value: 'rehearsal', 
      label: 'Rehearsal',
      requiresBudget: false,
      requiresContract: true,
      description: 'Managed by tour manager/admin with contracts'
    },
    { 
      value: 'sectional', 
      label: 'Sectional',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'member-meeting', 
      label: 'Member Meeting',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'exec-meeting', 
      label: 'Exec Board Meeting',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'voice-lesson', 
      label: 'Voice Lesson',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'tutorial', 
      label: 'Tutorial',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'social', 
      label: 'Social Event',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'meeting', 
      label: 'Meeting',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'workshop', 
      label: 'Workshop',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'audition', 
      label: 'Audition',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'other', 
      label: 'Other',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    }
  ];

  const selectedEventType = eventTypes.find(type => type.value === formData.event_type);
  const requiresBudget = selectedEventType?.requiresBudget || false;
  const requiresContract = selectedEventType?.requiresContract || false;

  // Image upload handlers
  const handleImageSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newImages: ImageUpload[] = fileArray.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageSelect(files);
    }
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async (eventId: string) => {
    if (images.length === 0) return;
    
    setUploadingImages(true);
    try {
      const uploadPromises = images.map(async (image, index) => {
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${eventId}/${Date.now()}_${index}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, image.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        // Save image record
        const { error: dbError } = await supabase
          .from('event_images')
          .insert({
            event_id: eventId,
            image_url: publicUrl,
            image_name: image.file.name,
            file_size: image.file.size,
            is_primary: index === 0, // First image is primary
            created_by: user?.id
          });

        if (dbError) throw dbError;
        return publicUrl;
      });

      await Promise.all(uploadPromises);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Permission checks
    if (requiresBudget && !isExecBoardMember) {
      toast({
        title: "Permission Denied",
        description: "Only executive board members can create events that require budgets.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (formData.is_recurring) {
        // Handle recurring events
        const { data, error } = await supabase.rpc('create_recurring_rehearsals', {
          start_date: formData.event_date_start,
          end_date: formData.recurring_end_type === 'date' ? formData.recurring_end_date : formData.event_date_start,
          created_by_id: user.id
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Created ${data} recurring events successfully!`,
        });
      } else {
        // Handle single event
        const eventData = {
          title: formData.title,
          event_type: formData.event_type,
          start_date: formData.event_date_start,
          end_date: formData.event_date_end || null,
          location: formData.location || null,
          is_travel_involved: formData.is_travel_involved,
          no_sing_rest_required: formData.no_sing_rest_required,
          no_sing_rest_date_start: formData.no_sing_rest_date_start || null,
          no_sing_rest_date_end: formData.no_sing_rest_date_end || null,
          description: formData.brief_description || null,
          registration_required: formData.approval_needed,
          calendar_id: formData.calendar_id,
          created_by: user.id,
          is_public: true,
          status: 'scheduled'
        };

        const { data: eventResult, error } = await supabase
          .from('gw_events')
          .insert([eventData])
          .select()
          .single();

        if (error) throw error;

        // Upload images if any
        if (images.length > 0) {
          await uploadImages(eventResult.id);
          
          // If multiple images, show album message
          if (images.length > 1) {
            toast({
              title: "Event Album Created",
              description: `Event created with ${images.length} images in the album!`,
            });
          }
        }

        if (images.length <= 1) {
          toast({
            title: "Success",
            description: "Event created successfully!",
          });
        }
      }

      onEventCreated?.();
      setOpen(false);
      
      // Reset form
      setFormData({
        calendar_id: calendars[0]?.id || '',
        event_type: 'performance',
        title: '',
        event_date_start: '',
        event_date_end: '',
        location: '',
        is_travel_involved: false,
        no_sing_rest_required: false,
        no_sing_rest_date_start: '',
        no_sing_rest_date_end: '',
        brief_description: '',
        approval_needed: false,
        is_recurring: false,
        recurring_frequency: 'weekly',
        recurring_days: ['monday', 'wednesday', 'friday'],
        recurring_end_date: '',
        recurring_end_type: 'date'
      });
      
      // Clean up images
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadCalendars();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Create Event</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Plan a new event with images and assign it to a calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Section: Calendar, Event Type, Event Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calendar_id">Calendar *</Label>
              <Select
                value={formData.calendar_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, calendar_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: calendar.color }}
                        />
                        {calendar.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Event Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Senior Send-Off Banquet"
                required
              />
            </div>
          </div>

          {/* Event Type Information */}
          {selectedEventType && (
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-2">
                {requiresBudget && (
                  <Badge variant="secondary" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Budget Required
                  </Badge>
                )}
                {requiresContract && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Contract Managed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedEventType.description}
              </p>
              
              {/* Permission Check */}
              {requiresBudget && !isExecBoardMember && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Only executive board members can create events that require budgets.
                </div>
              )}
              
              {requiresContract && !isTourManagerOrAdmin && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Contracts for this event type will be managed by the tour manager or administrators.
                </div>
              )}
            </div>
          )}

          {/* Event Images Upload */}
          <div className="space-y-4">
            <Label>Event Images</Label>
            <div 
              className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drop images here or click to upload</p>
                  <p className="text-xs text-muted-foreground">Supports single or multiple images</p>
                </div>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                onChange={(e) => e.target.files && handleImageSelect(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {images.map((image, index) => (
                  <Card key={index} className="relative group">
                    <CardContent className="p-1">
                      <img
                        src={image.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && images.length > 1 && (
                        <Badge className="absolute bottom-1 left-1 text-xs">Primary</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {images.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>Multiple images will create an event album</span>
              </div>
            )}
          </div>

          {/* Date and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date_start">Start Date *</Label>
              <Input
                id="event_date_start"
                type="datetime-local"
                value={formData.event_date_start}
                onChange={(e) => setFormData(prev => ({ ...prev, event_date_start: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date_end">End Date (Optional)</Label>
              <Input
                id="event_date_end"
                type="datetime-local"
                value={formData.event_date_end}
                onChange={(e) => setFormData(prev => ({ ...prev, event_date_end: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Room #, venue name, or city/state"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief_description">Brief Description</Label>
            <Textarea
              id="brief_description"
              value={formData.brief_description}
              onChange={(e) => setFormData(prev => ({ ...prev, brief_description: e.target.value }))}
              placeholder="One-liner description of the event"
              rows={2}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Travel Involved?</Label>
                <p className="text-sm text-muted-foreground">
                  Will this event require travel arrangements?
                </p>
              </div>
              <Switch
                checked={formData.is_travel_involved}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_travel_involved: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>No-Sing Rest Period Required?</Label>
                <p className="text-sm text-muted-foreground">
                  Does this event require a vocal rest period?
                </p>
              </div>
              <Switch
                checked={formData.no_sing_rest_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, no_sing_rest_required: checked }))}
              />
            </div>

            {formData.no_sing_rest_required && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="no_sing_rest_date_start">Rest Start Date</Label>
                  <Input
                    id="no_sing_rest_date_start"
                    type="date"
                    value={formData.no_sing_rest_date_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_sing_rest_date_start: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_sing_rest_date_end">Rest End Date</Label>
                  <Input
                    id="no_sing_rest_date_end"
                    type="date"
                    value={formData.no_sing_rest_date_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_sing_rest_date_end: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Approval Needed?</Label>
                <p className="text-sm text-muted-foreground">
                  Does this event need advisor/chair approval?
                </p>
              </div>
              <Switch
                checked={formData.approval_needed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, approval_needed: checked }))}
              />
            </div>
          </div>

          {/* Recurring Events Section */}
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Repeat Event
                </Label>
                <p className="text-sm text-muted-foreground">
                  Create recurring events (like rehearsals)
                </p>
              </div>
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
              />
            </div>

            {formData.is_recurring && (
              <div className="ml-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurring_frequency">Frequency</Label>
                    <Select
                      value={formData.recurring_frequency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurring_end_date">End Date</Label>
                    <Input
                      id="recurring_end_date"
                      type="date"
                      value={formData.recurring_end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImages}>
              {loading ? "Creating..." : uploadingImages ? "Uploading..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};