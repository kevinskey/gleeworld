import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Upload, X, Paperclip, Info, Maximize2, ArrowRight, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/useUsers";
import { AddressInput } from "@/components/shared/AddressInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, getDay } from "date-fns";

interface CreateEventDialogProps {
  onEventCreated: () => void;
  initialDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Generate time slots in 15-minute increments
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const m = minute.toString().padStart(2, '0');
      slots.push(`${h}:${m} ${ampm}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Convert 12-hour time to 24-hour format for form data
const to24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Convert 24-hour time to 12-hour format for display
const to12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const h = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    timezone: 'America/New_York',
    venue_name: '',
    address: '',
    max_attendees: '',
    registration_required: false,
    is_public: false,
    attendance_required: false,
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

  // Popover states
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);

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

  // Dynamic recurrence options based on selected date/time
  const recurrenceOptions = useMemo(() => {
    const dayOfWeek = startDate ? DAY_NAMES[getDay(startDate)] : 'Monday';
    const dayOfMonth = startDate ? startDate.getDate() : 1;
    const ordinal = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
    
    return [
      { value: 'never', label: 'Never' },
      { value: 'daily', label: `Daily at ${startTime}` },
      { value: 'weekly', label: `Weekly on ${dayOfWeek}` },
      { value: 'monthly', label: `Monthly on the ${dayOfMonth}${ordinal}` },
      { value: 'weekdays', label: 'Every weekday (Monday to Friday)' },
      { value: 'custom', label: 'Custom...' },
    ];
  }, [startDate, startTime]);

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
        setStartDate(initialDate);
        setEndDate(initialDate);
      } else {
        const today = new Date();
        setStartDate(today);
        setEndDate(today);
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
    if (!startDate) {
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
      const startTime24 = to24Hour(startTime);
      const endTime24 = to24Hour(endTime);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : startDateStr;
      
      const startDateTime = new Date(`${startDateStr}T${startTime24}:00`);
      const endDateTime = new Date(`${endDateStr}T${endTime24}:00`);

      // Determine actual recurrence type
      let recurrenceType = formData.recurrence_type;
      let recurrenceDays: number[] = [];
      
      if (recurrenceType === 'weekdays') {
        recurrenceType = 'weekly';
        recurrenceDays = [1, 2, 3, 4, 5]; // Mon-Fri
      } else if (recurrenceType === 'weekly' && startDate) {
        recurrenceDays = [getDay(startDate)];
      }

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
        recurrence_type: formData.recurrence_type !== 'never' ? recurrenceType : null,
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
            recurrence_type_param: recurrenceType,
            recurrence_interval_param: formData.recurrence_interval,
            recurrence_days_of_week_param: recurrenceDays.length > 0 ? recurrenceDays : null,
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
      timezone: 'America/New_York',
      venue_name: '',
      address: '',
      max_attendees: '',
      registration_required: false,
      is_public: false,
      attendance_required: false,
      recurrence_type: 'never',
      recurrence_interval: 1,
      recurrence_end_date: '',
      max_occurrences: 10,
      recurrence_days_of_week: [],
      passcode: '',
      passcode_enabled: false,
    });
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime('9:00 AM');
    setEndTime('10:00 AM');
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

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'M/d/yy');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <></>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
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

          {/* Date/Time Row - Zoom Style */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {/* Start Date */}
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[100px] justify-start text-left font-normal h-10 rounded-full",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  {startDate ? formatDateDisplay(startDate) : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    if (date && (!endDate || date > endDate)) {
                      setEndDate(date);
                    }
                    setStartDateOpen(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Start Time */}
            <Popover open={startTimeOpen} onOpenChange={setStartTimeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[100px] justify-start text-left font-normal h-10 rounded-full"
                >
                  {startTime}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[140px] p-0 bg-background border shadow-lg z-[100]" align="start" sideOffset={4}>
                <ScrollArea className="h-[240px] pointer-events-auto">
                  <div className="p-1">
                    {TIME_SLOTS.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={cn(
                          "w-full flex items-center justify-between h-9 px-3 text-sm font-normal rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                          time === startTime && "bg-muted"
                        )}
                        onClick={() => {
                          setStartTime(time);
                          setStartTimeOpen(false);
                        }}
                      >
                        {time}
                        {time === startTime && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            {/* End Time */}
            <Popover open={endTimeOpen} onOpenChange={setEndTimeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[100px] justify-start text-left font-normal h-10 rounded-full"
                >
                  {endTime}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[140px] p-0 bg-background border shadow-lg z-[100]" align="start" sideOffset={4}>
                <ScrollArea className="h-[240px] pointer-events-auto">
                  <div className="p-1">
                    {TIME_SLOTS.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={cn(
                          "w-full flex items-center justify-between h-9 px-3 text-sm font-normal rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                          time === endTime && "bg-muted"
                        )}
                        onClick={() => {
                          setEndTime(time);
                          setEndTimeOpen(false);
                        }}
                      >
                        {time}
                        {time === endTime && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* End Date */}
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[100px] justify-start text-left font-normal h-10 rounded-full",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  {endDate ? formatDateDisplay(endDate) : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setEndDateOpen(false);
                  }}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Timezone */}
          <div className="mb-4">
            <Select 
              value={formData.timezone} 
              onValueChange={value => setFormData(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger className="w-64 h-9 text-sm border-0 p-0 shadow-none hover:bg-transparent focus:ring-0">
                <SelectValue />
                <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
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
              <SelectTrigger className="w-auto min-w-[140px] h-9 text-sm rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {recurrenceOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      {option.label}
                      {formData.recurrence_type === option.value && <Check className="h-4 w-4 ml-2" />}
                    </div>
                  </SelectItem>
                ))}
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
                <SelectContent className="max-h-48 bg-background border shadow-lg z-50">
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
                <SelectContent className="bg-background border shadow-lg z-50">
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
                  <SelectContent className="bg-background border shadow-lg z-50">
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

          {/* More Options Collapsible */}
          <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
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

              {/* Custom Recurrence Settings */}
              {formData.recurrence_type === 'custom' && (
                <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
                  <Label className="text-sm font-medium">Custom Recurrence</Label>
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
                        <Select 
                          value={formData.recurrence_type === 'custom' ? 'weekly' : formData.recurrence_type}
                          onValueChange={value => setFormData(prev => ({ ...prev, recurrence_type: value }))}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="daily">days</SelectItem>
                            <SelectItem value="weekly">weeks</SelectItem>
                            <SelectItem value="monthly">months</SelectItem>
                          </SelectContent>
                        </Select>
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
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Repeat on</Label>
                    <div className="flex gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <Button
                          key={i}
                          type="button"
                          variant={formData.recurrence_days_of_week.includes(i) ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0 text-xs rounded-full"
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
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="text-primary"
          >
            More Options
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="px-6 rounded-full">
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
