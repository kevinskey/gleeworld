import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Sparkles, Send, Upload, X, Users, Trash2, CalendarDays, Clock, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/useUsers";
import { AddressInput } from "@/components/shared/AddressInput";
import { UserPicker } from "./UserPicker";
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
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
    event_type: 'performance',
    start_date: '',
    end_date: '',
    venue_name: '',
    address: '',
    max_attendees: '',
    registration_required: false,
    is_public: true,
    attendance_required: false,
    attendance_deadline: '',
    late_arrival_allowed: true,
    excuse_required: false,
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    max_occurrences: 10,
    recurrence_days_of_week: [] as number[] // 0=Sunday, 1=Monday, ..., 6=Saturday
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Team member management state
  interface TeamMember {
    userId: string;
    name: string;
    email: string;
    responsibility: string;
  }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'sms'>('email');

  // Appointment scheduling state
  const [requiresAppointments, setRequiresAppointments] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [appointmentType, setAppointmentType] = useState('planning');
  const [appointmentDescription, setAppointmentDescription] = useState('');

  // Calendar management state
  const [calendars, setCalendars] = useState<{
    id: string;
    name: string;
    color: string;
  }[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const eventTypes = [{
    value: 'performance',
    label: 'Performance'
  }, {
    value: 'rehearsal',
    label: 'Rehearsal'
  }, {
    value: 'sectional',
    label: 'Sectional'
  }, {
    value: 'member-meeting',
    label: 'Member Meeting'
  }, {
    value: 'exec-meeting',
    label: 'Exec Board Meeting'
  }, {
    value: 'voice-lesson',
    label: 'Voice Lesson'
  }, {
    value: 'tutorial',
    label: 'Tutorial'
  }, {
    value: 'social',
    label: 'Social Event'
  }, {
    value: 'meeting',
    label: 'Meeting'
  }, {
    value: 'workshop',
    label: 'Workshop'
  }, {
    value: 'audition',
    label: 'Audition'
  }, {
    value: 'other',
    label: 'Other'
  }];

  // Helper function to calculate attendance deadline (30 minutes after start)
  const calculateAttendanceDeadline = (startDate: string) => {
    if (!startDate) return '';
    const start = new Date(startDate + ':00');
    const deadline = new Date(start.getTime() + 30 * 60000); // Add 30 minutes
    return deadline.toISOString().slice(0, 16);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
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
      const {
        error: uploadError
      } = await supabase.storage.from('event-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data
      } = supabase.storage.from('event-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Load calendars when dialog opens
  const loadCalendars = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_calendars').select('id, name, color, is_default').eq('is_visible', true).order('is_default', {
        ascending: false
      });
      if (error) throw error;

      // If no calendars exist, create a default personal calendar
      if (!data || data.length === 0) {
        if (!user) throw new Error('You must be signed in to create a calendar.');
        const {
          data: newCal,
          error: createCalError
        } = await supabase.from('gw_calendars').insert({
          name: 'My Events',
          description: 'Personal event calendar',
          color: '#6366f1',
          is_visible: true,
          is_default: true,
          created_by: user.id
        }).select('id, name, color, is_default').single();
        if (createCalError) throw createCalError;
        setCalendars([newCal]);
        setSelectedCalendarId(newCal.id);
        return;
      }
      setCalendars(data || []);
      // Set default calendar if no calendar is selected
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
      // Pre-fill date if initialDate is provided, defaulting to 12:00 AM
      if (initialDate) {
        const year = initialDate.getFullYear();
        const month = String(initialDate.getMonth() + 1).padStart(2, '0');
        const day = String(initialDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}T00:00`;
        setFormData(prev => ({
          ...prev,
          start_date: dateString
        }));
      }
    }
  }, [open, initialDate]);

  // Team member management functions
  const {
    users,
    loading: usersLoading
  } = useUsers();
  const addTeamMember = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user && !teamMembers.find(tm => tm.userId === userId)) {
      setTeamMembers(prev => [...prev, {
        userId: user.id,
        name: user.full_name || user.email,
        email: user.email,
        responsibility: ''
      }]);
    }
  };
  const removeTeamMember = (userId: string) => {
    setTeamMembers(prev => prev.filter(tm => tm.userId !== userId));
  };
  const updateTeamMemberResponsibility = (userId: string, responsibility: string) => {
    setTeamMembers(prev => prev.map(tm => tm.userId === userId ? {
      ...tm,
      responsibility
    } : tm));
  };
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
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-event-description', {
        body: {
          title: formData.title,
          eventType: formData.event_type,
          venue: formData.venue_name,
          maxAttendees: formData.max_attendees
        }
      });
      if (error) throw error;
      setFormData(prev => ({
        ...prev,
        description: data.description
      }));
      toast({
        title: "Success",
        description: "AI-generated description added!"
      });
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

    // Validate required fields
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
        description: "Start date and time is required",
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
      const eventData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        event_type: formData.event_type,
        start_date: formData.start_date ? new Date(formData.start_date + ':00').toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date + ':00').toISOString() : null,
        location: null,
        venue_name: formData.venue_name?.trim() || null,
        address: formData.address?.trim() || null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_required: formData.registration_required,
        is_public: formData.is_public,
        attendance_required: formData.attendance_required,
        attendance_deadline: formData.attendance_deadline ? new Date(formData.attendance_deadline + ':00').toISOString() : null,
        late_arrival_allowed: formData.late_arrival_allowed,
        excuse_required: formData.excuse_required,
        created_by: user.id,
        status: 'scheduled',
        calendar_id: selectedCalendarId,
        is_recurring: formData.is_recurring,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? new Date(formData.recurrence_end_date + 'T23:59:59').toISOString() : null,
        max_occurrences: formData.is_recurring ? formData.max_occurrences : null
      };
      console.log('Creating event with data:', eventData);
      const {
        data: newEvent,
        error
      } = await supabase.from('gw_events').insert([eventData]).select().single();
      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Upload image if selected
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, newEvent.id);
        if (imageUrl) {
          // Update the event with the image URL in the correct table
          await supabase.from('gw_events').update({
            image_url: imageUrl
          }).eq('id', newEvent.id);
        }
      }

      // Save team members to event_team_members table
      if (teamMembers.length > 0) {
        const teamMemberData = teamMembers.map(member => ({
          event_id: newEvent.id,
          user_id: member.userId,
          role: member.responsibility || 'Team Member'
        }));
        const {
          error: teamError
        } = await supabase.from('event_team_members').insert(teamMemberData);
        if (teamError) {
          console.error('Error saving team members:', teamError);
        }

        // Send notifications to team members
        try {
          await supabase.functions.invoke('send-event-notifications', {
            body: {
              eventId: newEvent.id,
              eventTitle: formData.title,
              eventDate: formData.start_date,
              teamMembers: teamMembers,
              notificationMethod: notificationMethod,
              message: notificationMessage
            }
          });
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
        }
      }

      // Create appointments if required
      if (requiresAppointments && appointmentDate && appointmentTime && teamMembers.length > 0) {
        try {
          const appointmentPromises = teamMembers.map(async (member, index) => {
            // Stagger appointments by the duration + 5 min buffer
            const appointmentDateTime = new Date(appointmentDate);
            const [hours, minutes] = appointmentTime.split(':').map(Number);
            appointmentDateTime.setHours(hours, minutes + index * (appointmentDuration + 5), 0, 0);
            const appointmentData = {
              title: `${formData.title} - ${member.responsibility || 'Team Planning'}`,
              description: appointmentDescription || `Planning meeting for ${formData.title} with ${member.name}`,
              client_name: member.name,
              client_email: member.email,
              client_phone: '',
              appointment_date: appointmentDateTime.toISOString(),
              duration_minutes: appointmentDuration,
              appointment_type: appointmentType,
              status: 'confirmed',
              created_by: user.id,
              assigned_to: member.userId
            };
            return supabase.from('gw_appointments').insert(appointmentData).select().single();
          });
          const appointmentResults = await Promise.all(appointmentPromises);
          const successfulAppointments = appointmentResults.filter(result => !result.error);
          if (successfulAppointments.length > 0) {
            // Send appointment notifications
            await supabase.functions.invoke('send-appointment-notification', {
              body: {
                appointments: successfulAppointments.map(result => result.data),
                eventTitle: formData.title,
                eventId: newEvent.id
              }
            });
          }
        } catch (appointmentError) {
          console.error('Error creating appointments:', appointmentError);
          // Don't fail event creation if appointments fail
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

      // Create recurring events if enabled
      if (formData.is_recurring && newEvent) {
        try {
          const {
            data: recurrenceCount,
            error: recurrenceError
          } = await supabase.rpc('create_recurring_event_instances', {
            parent_event_id_param: newEvent.id,
            recurrence_type_param: formData.recurrence_type,
            recurrence_interval_param: formData.recurrence_interval,
            recurrence_days_of_week_param: formData.recurrence_type === 'weekly' && formData.recurrence_days_of_week.length > 0 
              ? formData.recurrence_days_of_week 
              : null,
            recurrence_end_date_param: formData.recurrence_end_date ? new Date(formData.recurrence_end_date + 'T23:59:59').toISOString() : null,
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
      const totalNotifications = teamMembers.length + selectedUserIds.length;
      const successMessage = formData.is_recurring ? `Event created successfully with recurring instances!${totalNotifications > 0 ? ` Notifications sent to ${totalNotifications} user(s).` : ''}` : `Event created successfully!${totalNotifications > 0 ? ` Notifications sent to ${totalNotifications} user(s).` : ''}`;
      toast({
        title: "Success",
        description: successMessage
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
        is_public: true,
        attendance_required: false,
        attendance_deadline: '',
        late_arrival_allowed: true,
        excuse_required: false,
        is_recurring: false,
        recurrence_type: 'weekly',
        recurrence_interval: 1,
        recurrence_end_date: '',
        max_occurrences: 10,
        recurrence_days_of_week: []
      });
      setSelectedUserIds([]);
      setNotificationMessage('');
      setTeamMembers([]);
      setNotificationMethod('email');
      setRequiresAppointments(false);
      setAppointmentDate(undefined);
      setAppointmentTime('');
      setAppointmentDuration(30);
      setAppointmentType('planning');
      setAppointmentDescription('');
      setImageFile(null);
      setImagePreview('');
      setSelectedCalendarId('');
      onEventCreated();
    } catch (err) {
      console.error('Error creating event:', err);
      const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in (err as any) ? (err as any).message : 'Failed to create event';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="text-lg">Create New Event</DialogTitle>
          <DialogDescription className="text-sm">
            Add a new event to the calendar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Basic Info */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Calendar *</Label>
                  <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background border shadow-lg">
                      {calendars.map(calendar => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: calendar.color }} />
                            <span className="text-sm">{calendar.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={formData.event_type} onValueChange={value => setFormData(prev => ({ ...prev, event_type: value }))}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Event name" required className="h-8" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Description</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={generateDescription} disabled={generatingDescription || !formData.title} className="h-5 text-xs px-1">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Button>
                </div>
                <Textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Description..." rows={2} className="text-sm resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Venue</Label>
                  <Input value={formData.venue_name} onChange={e => setFormData(prev => ({ ...prev, venue_name: e.target.value }))} placeholder="Location" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Attendees</Label>
                  <Input type="number" value={formData.max_attendees} onChange={e => setFormData(prev => ({ ...prev, max_attendees: e.target.value }))} placeholder="Optional" className="h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <AddressInput value={formData.address} onChange={value => setFormData(prev => ({ ...prev, address: value }))} placeholder="Full address" onPlaceSelect={place => {
                  if (place.formatted_address) setFormData(prev => ({ ...prev, address: place.formatted_address || '' }));
                }} />
              </div>

              {/* Image - Compact */}
              <div className="flex items-center gap-2">
                <Label className="text-xs">Image:</Label>
                {imagePreview ? (
                  <div className="flex items-center gap-2">
                    <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded border" />
                    <Button type="button" variant="ghost" size="sm" onClick={removeImage} className="h-6 w-6 p-0">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input id="event_image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('event_image')?.click()} className="h-6 text-xs">
                      <Upload className="h-3 w-3 mr-1" /> Upload
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Date/Time & Options */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Start *</Label>
                  <Input type="datetime-local" value={formData.start_date} onChange={e => {
                    const newStartDate = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      start_date: newStartDate,
                      attendance_deadline: prev.attendance_required && newStartDate ? calculateAttendanceDeadline(newStartDate) : prev.attendance_deadline
                    }));
                  }} required className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="datetime-local" value={formData.end_date} onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>

              {/* Quick Options */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2 bg-muted/30 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Public</span>
                  <Switch checked={formData.is_public} onCheckedChange={checked => setFormData(prev => ({ ...prev, is_public: checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Registration</span>
                  <Switch checked={formData.registration_required} onCheckedChange={checked => setFormData(prev => ({ ...prev, registration_required: checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Attendance</span>
                  <Switch checked={formData.attendance_required} onCheckedChange={checked => {
                    setFormData(prev => ({
                      ...prev,
                      attendance_required: checked,
                      attendance_deadline: checked && prev.start_date ? calculateAttendanceDeadline(prev.start_date) : prev.attendance_deadline
                    }));
                  }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Recurring</span>
                  <Switch checked={formData.is_recurring} onCheckedChange={checked => setFormData(prev => ({ ...prev, is_recurring: checked }))} />
                </div>
              </div>

              {/* Attendance Settings */}
              {formData.attendance_required && (
                <div className="p-2 border rounded-lg space-y-2 bg-background">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <UserCheck className="h-3 w-3" /> Attendance
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="datetime-local" value={formData.attendance_deadline} onChange={e => setFormData(prev => ({ ...prev, attendance_deadline: e.target.value }))} className="h-7 text-xs" placeholder="Deadline" />
                    <div className="flex items-center justify-around">
                      <label className="flex items-center gap-1 text-xs">
                        <Switch checked={formData.late_arrival_allowed} onCheckedChange={checked => setFormData(prev => ({ ...prev, late_arrival_allowed: checked }))} /> Late OK
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Recurring Settings */}
              {formData.is_recurring && (
                <div className="p-2 border rounded-lg space-y-2 bg-background">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <CalendarDays className="h-3 w-3" /> Recurrence
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={formData.recurrence_type} onValueChange={value => setFormData(prev => ({ ...prev, recurrence_type: value }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Input type="number" min="1" max="12" value={formData.recurrence_interval} onChange={e => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(e.target.value) || 1 }))} className="h-7 w-12 text-xs" />
                      <span className="text-xs">{formData.recurrence_type === 'daily' ? 'd' : formData.recurrence_type === 'weekly' ? 'wk' : 'mo'}</span>
                    </div>
                    <Input 
                      type="number" 
                      min="1"
                      value={formData.recurrence_type === 'weekly' && formData.recurrence_days_of_week.length > 0 
                        ? Math.ceil(formData.max_occurrences / Math.max(formData.recurrence_days_of_week.length, 1))
                        : formData.max_occurrences
                      } 
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        if (formData.recurrence_type === 'weekly' && formData.recurrence_days_of_week.length > 0) {
                          setFormData(prev => ({ ...prev, max_occurrences: val * prev.recurrence_days_of_week.length }));
                        } else {
                          setFormData(prev => ({ ...prev, max_occurrences: val }));
                        }
                      }} 
                      className="h-7 text-xs"
                      placeholder={formData.recurrence_type === 'weekly' && formData.recurrence_days_of_week.length > 0 ? "wks" : "times"}
                    />
                  </div>
                  {formData.recurrence_type === 'weekly' && (
                    <div className="flex gap-1">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <Button key={i} type="button" variant={formData.recurrence_days_of_week.includes(i) ? "default" : "outline"} size="sm" className="w-7 h-7 p-0 text-xs"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            recurrence_days_of_week: prev.recurrence_days_of_week.includes(i)
                              ? prev.recurrence_days_of_week.filter(x => x !== i)
                              : [...prev.recurrence_days_of_week, i].sort((a, b) => a - b)
                          }))}>
                          {d}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Input type="date" value={formData.recurrence_end_date} onChange={e => setFormData(prev => ({ ...prev, recurrence_end_date: e.target.value }))} className="h-7 text-xs" placeholder="End date (optional)" />
                </div>
              )}

              {/* Team & Notifications - Collapsible */}
              <details className="border rounded-lg">
                <summary className="p-2 cursor-pointer text-xs font-medium hover:bg-muted/50 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Team & Notifications
                  {teamMembers.length > 0 && <span className="ml-auto bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">{teamMembers.length}</span>}
                </summary>
                <div className="p-2 pt-0 space-y-2">
                  <Select onValueChange={addTeamMember}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Add member..." /></SelectTrigger>
                    <SelectContent className="z-50 bg-background border shadow-lg">
                      {usersLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : users.filter(u => !teamMembers.find(tm => tm.userId === u.id)).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teamMembers.map(m => (
                    <div key={m.userId} className="flex items-center gap-1 p-1 border rounded text-xs">
                      <span className="truncate flex-1">{m.name}</span>
                      <Input placeholder="Role" value={m.responsibility} onChange={e => updateTeamMemberResponsibility(m.userId, e.target.value)} className="h-6 w-24 text-xs" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTeamMember(m.userId)} className="h-5 w-5 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <div className="pt-1 border-t">
                    <Label className="text-xs text-muted-foreground">Additional notifications</Label>
                    <UserPicker selectedUserIds={selectedUserIds} onSelectionChange={setSelectedUserIds} />
                  </div>
                </div>
              </details>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-2 pt-3 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} size="sm">Cancel</Button>
          <Button type="submit" disabled={loading} size="sm" onClick={handleSubmit}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};