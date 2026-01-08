import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Upload, X, Users, ChevronDown, ArrowRight, Paperclip, Info, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/useUsers";
import { AddressInput } from "@/components/shared/AddressInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreateEventDialogProps {
  onEventCreated: () => void;
  initialDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreateEventDialog = ({
  onEventCreated,
  initialDate,
  open: externalOpen,
  onOpenChange
}: CreateEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_date: '',
    start_time: '09:00',
    end_time: '10:00',
    end_date: '',
    timezone: 'America/New_York',
    venue_name: '',
    address: '',
    max_attendees: '',
    registration_required: false,
    is_public: false,
    attendance_required: false,
    is_recurring: false,
    recurrence_type: 'never',
    recurrence_interval: 1,
    recurrence_end_date: '',
    max_occurrences: 10,
    recurrence_days_of_week: [] as number[],
    passcode: '',
    passcode_enabled: false,
  });

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [calendars, setCalendars] = useState<{ id: string; name: string; color: string; }[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const { users, loading: usersLoading } = useUsers();

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

  const timezones = [
    { value: 'America/New_York', label: '(GMT-05:00) Eastern Time (US a...' },
    { value: 'America/Chicago', label: '(GMT-06:00) Central Time' },
    { value: 'America/Denver', label: '(GMT-07:00) Mountain Time' },
    { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time' },
    { value: 'UTC', label: '(GMT+00:00) UTC' },
  ];

  const generatePasscode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = e => {
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
      const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const loadCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, color, is_default')
        .eq('is_visible', true)
        .order('is_default', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        if (!user) throw new Error('You must be signed in to create a calendar.');
        const { data: newCal, error: createCalError } = await supabase
          .from('gw_calendars')
          .insert({
            name: 'My Events',
            description: 'Personal event calendar',
            color: '#6366f1',
            is_visible: true,
            is_default: true,
            created_by: user.id
          })
          .select('id, name, color, is_default')
          .single();
        if (createCalError) throw createCalError;
        setCalendars([newCal]);
        setSelectedCalendarId(newCal.id);
        return;
      }
      setCalendars(data || []);
      if (!selectedCalendarId && data && data.length > 0) {
        const defaultCal = data.find(cal => (cal as any).is_default) || data[0];
        setSelectedCalendarId(defaultCal.id);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast({
        title: "Error",
        description: "Failed to load calendars",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadCalendars();
      if (initialDate) {
        const dateStr = initialDate.toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          start_date: dateStr,
          end_date: dateStr
        }));
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          start_date: today,
          end_date: today
        }));
      }
    }
  }, [open, initialDate]);

  const generateDescription = async () => {
    if (!formData.title) {
      toast({
        title: "Missing Information",
        description: "Please enter an event title first",
        variant: "destructive"
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
      toast({ title: "Success", description: "AI-generated description added!" });
    } catch (err) {
      console.error('Error generating description:', err);
      toast({
        title: "Error",
        description: "Failed to generate description",
        variant: "destructive"
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Event title is required",
        variant: "destructive"
      });
      return;
    }
    if (!formData.start_date) {
      toast({
        title: "Validation Error",
        description: "Start date is required",
        variant: "destructive"
      });
      return;
    }
    if (!selectedCalendarId) {
      toast({
        title: "Validation Error",
        description: "Please select a calendar for this event",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Construct start and end dates with times
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
      const endDate = formData.end_date || formData.start_date;
      const endDateTime = new Date(`${endDate}T${formData.end_time}:00`);

      const eventData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        event_type: formData.event_type,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        location: null,
        venue_name: formData.venue_name?.trim() || null,
        address: formData.address?.trim() || null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_required: formData.registration_required,
        is_public: formData.is_public,
        attendance_required: formData.attendance_required,
        created_by: user.id,
        status: 'scheduled',
        calendar_id: selectedCalendarId,
        is_recurring: formData.recurrence_type !== 'never',
        recurrence_type: formData.recurrence_type !== 'never' ? formData.recurrence_type : null,
        recurrence_interval: formData.recurrence_type !== 'never' ? formData.recurrence_interval : null,
        recurrence_end_date: formData.recurrence_type !== 'never' && formData.recurrence_end_date 
          ? new Date(formData.recurrence_end_date + 'T23:59:59').toISOString() 
          : null,
        max_occurrences: formData.recurrence_type !== 'never' ? formData.max_occurrences : null
      };

      console.log('Creating event with data:', eventData);
      const { data: newEvent, error } = await supabase
        .from('gw_events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Upload image if selected
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile, newEvent.id);
        if (imageUrl) {
          await supabase.from('gw_events').update({ image_url: imageUrl }).eq('id', newEvent.id);
        }
      }

      // Create recurring events if enabled
      if (formData.recurrence_type !== 'never' && newEvent) {
        try {
          const { data: recurrenceCount, error: recurrenceError } = await supabase.rpc('create_recurring_event_instances', {
            parent_event_id_param: newEvent.id,
            recurrence_type_param: formData.recurrence_type,
            recurrence_interval_param: formData.recurrence_interval,
            recurrence_days_of_week_param: formData.recurrence_type === 'weekly' && formData.recurrence_days_of_week.length > 0 
              ? formData.recurrence_days_of_week 
              : null,
            recurrence_end_date_param: formData.recurrence_end_date 
              ? new Date(formData.recurrence_end_date + 'T23:59:59').toISOString() 
              : null,
            max_occurrences_param: formData.max_occurrences
          });
          if (recurrenceError) {
            console.error('Error creating recurring events:', recurrenceError);
            toast({
              title: "Warning",
              description: "Event created but recurring instances failed to generate",
              variant: "destructive"
            });
          } else {
            console.log(`Created ${recurrenceCount} recurring events`);
          }
        } catch (recurrenceErr) {
          console.error('Error creating recurring events:', recurrenceErr);
        }
      }

      // Send notifications if users are selected
      if (selectedUserIds.length > 0) {
        try {
          await supabase.functions.invoke('send-event-notifications', {
            body: {
              eventId: newEvent.id,
              eventTitle: formData.title,
              eventDate: startDateTime,
              userIds: selectedUserIds,
              message: ''
            }
          });
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
        }
      }

      toast({
        title: "Success",
        description: formData.recurrence_type !== 'never' 
          ? "Event created successfully with recurring instances!" 
          : "Event created successfully!"
      });

      setOpen(false);
      resetForm();
      onEventCreated();
    } catch (err) {
      console.error('Error creating event:', err);
      const message = err instanceof Error ? err.message : 'Failed to create event';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'meeting',
      start_date: '',
      start_time: '09:00',
      end_time: '10:00',
      end_date: '',
      timezone: 'America/New_York',
      venue_name: '',
      address: '',
      max_attendees: '',
      registration_required: false,
      is_public: false,
      attendance_required: false,
      is_recurring: false,
      recurrence_type: 'never',
      recurrence_interval: 1,
      recurrence_end_date: '',
      max_occurrences: 10,
      recurrence_days_of_week: [],
      passcode: '',
      passcode_enabled: false,
    });
    setSelectedUserIds([]);
    setImageFile(null);
    setImagePreview('');
    setSelectedCalendarId('');
    setShowMoreOptions(false);
  };

  const addInvitee = (userId: string) => {
    if (!selectedUserIds.includes(userId)) {
      setSelectedUserIds(prev => [...prev, userId]);
    }
  };

  const removeInvitee = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <></>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header with expand/close buttons */}
        <div className="flex items-center justify-end gap-2 p-3 pb-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Title Input - Large and prominent */}
          <div className="mb-6">
            <Input
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Add title"
              className="text-xl font-medium border-2 border-primary/30 focus:border-primary h-14 px-4 rounded-lg bg-muted/30"
              required
            />
          </div>

          {/* Date/Time Row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Input
              type="date"
              value={formData.start_date}
              onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="h-10 w-28 text-sm border rounded-lg"
            />
            <Input
              type="time"
              value={formData.start_time}
              onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className="h-10 w-28 text-sm border rounded-lg"
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="time"
              value={formData.end_time}
              onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              className="h-10 w-28 text-sm border rounded-lg"
            />
            <Input
              type="date"
              value={formData.end_date || formData.start_date}
              onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="h-10 w-28 text-sm border rounded-lg"
            />
          </div>

          {/* Timezone */}
          <div className="mb-4">
            <Select 
              value={formData.timezone} 
              onValueChange={value => setFormData(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger className="w-64 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repeat */}
          <div className="flex items-center gap-3 mb-6">
            <Label className="text-sm font-medium">Repeat</Label>
            <Select 
              value={formData.recurrence_type} 
              onValueChange={value => setFormData(prev => ({ ...prev, recurrence_type: value }))}
            >
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invitees Section */}
          <div className="mb-6">
            <Label className="text-sm font-bold mb-2 block">Invitees</Label>
            <div className="space-y-2">
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUserIds.map(userId => {
                    const invitee = users.find(u => u.id === userId);
                    return (
                      <div key={userId} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm">
                        <span>{invitee?.full_name || invitee?.email}</span>
                        <button type="button" onClick={() => removeInvitee(userId)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Select onValueChange={addInvitee}>
                <SelectTrigger className="h-10 border-2 border-primary/30 rounded-lg">
                  <SelectValue placeholder="Add invitees" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {usersLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    users
                      .filter(u => !selectedUserIds.includes(u.id))
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Event Type */}
          <div className="mb-6">
            <Label className="text-sm font-bold mb-2 block">Event Type</Label>
            <div className="flex items-center gap-4">
              <Select value={formData.event_type} onValueChange={value => setFormData(prev => ({ ...prev, event_type: value }))}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {calendars.length > 0 && (
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger className="w-40 h-10">
                    <SelectValue placeholder="Calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map(calendar => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                          <span>{calendar.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Description / Agenda */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-bold">Event description</Label>
              <Button 
                type="button" 
                variant="link" 
                size="sm" 
                onClick={generateDescription} 
                disabled={generatingDescription || !formData.title}
                className="h-auto p-0 text-primary"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Create with AI
                <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">NEW</span>
              </Button>
            </div>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add description or agenda..."
              rows={3}
              className="resize-none border-2 border-muted rounded-lg"
            />
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm font-bold">Attachments</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add files or images to the event</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {imagePreview ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                <span className="text-sm flex-1 truncate">{imageFile?.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Input id="event_image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('event_image')?.click()}
                  className="h-10 gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Add attachments
                </Button>
              </>
            )}
          </div>

          {/* Location */}
          <div className="mb-6">
            <Label className="text-sm font-bold mb-2 block">Location</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={formData.venue_name}
                onChange={e => setFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                placeholder="Venue name"
                className="h-10"
              />
              <Input
                type="number"
                value={formData.max_attendees}
                onChange={e => setFormData(prev => ({ ...prev, max_attendees: e.target.value }))}
                placeholder="Max attendees"
                className="h-10"
              />
            </div>
            <div className="mt-2">
              <AddressInput
                value={formData.address}
                onChange={value => setFormData(prev => ({ ...prev, address: value }))}
                placeholder="Full address"
                onPlaceSelect={place => {
                  if (place.formatted_address) setFormData(prev => ({ ...prev, address: place.formatted_address || '' }));
                }}
              />
            </div>
          </div>

          {/* Event Security */}
          <div className="mb-6">
            <Label className="text-sm font-bold mb-3 block">Event Security</Label>
            <div className="flex items-center gap-3">
              <Checkbox
                id="passcode"
                checked={formData.passcode_enabled}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    passcode_enabled: !!checked,
                    passcode: checked && !prev.passcode ? generatePasscode() : prev.passcode
                  }));
                }}
              />
              <Label htmlFor="passcode" className="text-sm font-normal">Passcode</Label>
              {formData.passcode_enabled && (
                <>
                  <Input
                    value={formData.passcode}
                    onChange={e => setFormData(prev => ({ ...prev, passcode: e.target.value }))}
                    className="w-24 h-8 text-sm"
                    maxLength={6}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Only users who have the invite link or passcode can join the event</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-7">
              Only users who have the invite link or passcode can join the event
            </p>
          </div>

          {/* Quick Toggles in More Options */}
          <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between h-10 px-0">
                <span className="text-sm font-medium">More Options</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Public Event</span>
                  <Switch 
                    checked={formData.is_public} 
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, is_public: checked }))} 
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Registration Required</span>
                  <Switch 
                    checked={formData.registration_required} 
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, registration_required: checked }))} 
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Attendance Tracking</span>
                  <Switch 
                    checked={formData.attendance_required} 
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, attendance_required: checked }))} 
                  />
                </div>
              </div>

              {/* Recurrence Settings */}
              {formData.recurrence_type !== 'never' && (
                <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
                  <Label className="text-sm font-medium">Recurrence Settings</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Repeat every</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={formData.recurrence_interval}
                          onChange={e => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(e.target.value) || 1 }))}
                          className="h-8 w-16 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">
                          {formData.recurrence_type === 'daily' ? 'day(s)' : formData.recurrence_type === 'weekly' ? 'week(s)' : 'month(s)'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max occurrences</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.max_occurrences}
                        onChange={e => setFormData(prev => ({ ...prev, max_occurrences: parseInt(e.target.value) || 1 }))}
                        className="h-8 w-full text-sm mt-1"
                      />
                    </div>
                  </div>
                  {formData.recurrence_type === 'weekly' && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Repeat on</Label>
                      <div className="flex gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant={formData.recurrence_days_of_week.includes(i) ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0 text-xs"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              recurrence_days_of_week: prev.recurrence_days_of_week.includes(i)
                                ? prev.recurrence_days_of_week.filter(x => x !== i)
                                : [...prev.recurrence_days_of_week, i].sort((a, b) => a - b)
                            }))}
                          >
                            {d}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">End date (optional)</Label>
                    <Input
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={e => setFormData(prev => ({ ...prev, recurrence_end_date: e.target.value }))}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-background">
          <Button type="button" variant="ghost" onClick={() => setShowMoreOptions(!showMoreOptions)}>
            More Options
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="px-6">
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
