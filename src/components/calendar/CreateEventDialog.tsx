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
import { Plus, Sparkles, Send, Upload, X, Users, Trash2, CalendarDays, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/useUsers";
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
  const [calendars, setCalendars] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

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

  // Load calendars when dialog opens
  const loadCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, color')
        .eq('is_visible', true)
        .order('is_default', { ascending: false });

      if (error) throw error;

      setCalendars(data || []);
      // Set default calendar if available
      const defaultCal = data?.find(cal => cal.name.toLowerCase().includes('default'));
      if (defaultCal && !selectedCalendarId) {
        setSelectedCalendarId(defaultCal.id);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadCalendars();
    }
  }, [open]);

  // Team member management functions
  const { users, loading: usersLoading } = useUsers();
  
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
    setTeamMembers(prev => prev.map(tm => 
      tm.userId === userId ? { ...tm, responsibility } : tm
    ));
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
        start_date: formData.start_date ? new Date(formData.start_date + ':00').toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date + ':00').toISOString() : null,
        location: null,
        venue_name: formData.venue_name || null,
        address: formData.address || null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_required: formData.registration_required,
        is_public: formData.is_public,
        created_by: user.id,
        status: 'scheduled'
      };

      // Use selected calendar or get default calendar
      let calendarId = selectedCalendarId;
      
      if (!calendarId) {
        const { data: existingCalendar } = await supabase
          .from('gw_calendars')
          .select('id')
          .eq('is_default', true)
          .single();

        if (existingCalendar) {
          calendarId = existingCalendar.id;
        } else {
          console.warn('No default calendar found');
        }
      }

      const eventDataWithCalendar = {
        ...eventData,
        ...(calendarId && { calendar_id: calendarId })
      };

      const { data: newEvent, error } = await supabase
        .from('gw_events')
        .insert([eventDataWithCalendar])
        .select()
        .single();

      if (error) throw error;

      // Upload image if selected
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, newEvent.id);
        if (imageUrl) {
          // Update the event with the image URL in the correct table
          await supabase
            .from('gw_events')
            .update({ image_url: imageUrl })
            .eq('id', newEvent.id);
        }
      }

      // Save team members to event_team_members table
      if (teamMembers.length > 0) {
        const teamMemberData = teamMembers.map(member => ({
          event_id: newEvent.id,
          user_id: member.userId,
          role: member.responsibility || 'Team Member'
        }));

        const { error: teamError } = await supabase
          .from('event_team_members')
          .insert(teamMemberData);

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
            appointmentDateTime.setHours(hours, minutes + (index * (appointmentDuration + 5)), 0, 0);

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

            return supabase
              .from('gw_appointments')
              .insert(appointmentData)
              .select()
              .single();
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

      const totalNotifications = teamMembers.length + selectedUserIds.length;
      toast({
        title: "Success",
        description: `Event created successfully!${totalNotifications > 0 ? ` Notifications sent to ${totalNotifications} user(s).` : ''}`,
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
        <Button size="sm" className="gap-1 text-xs whitespace-nowrap w-full px-2">
          <Plus className="h-3 w-3" />
          <span className="hidden xs:inline">Add Event</span>
          <span className="xs:hidden">Add</span>
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
            {/* Calendar Selection */}
            <div className="space-y-2">
              <Label htmlFor="calendar">Calendar *</Label>
              <Select
                value={selectedCalendarId}
                onValueChange={setSelectedCalendarId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a calendar..." />
                </SelectTrigger>
                <SelectContent className="max-h-40 overflow-y-auto z-50 bg-background border shadow-lg">
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: calendar.color }}
                        />
                        <span>{calendar.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Team Member Management Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Event Team Members
                </Label>
                <p className="text-sm text-muted-foreground">
                  Assign team members responsible for this event
                </p>
                
                {/* User Selection Dropdown */}
                <Select onValueChange={addTeamMember}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a team member to add..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-40 overflow-y-auto z-50 bg-background border shadow-lg">
                    {usersLoading ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : (
                      users
                        .filter(user => !teamMembers.find(tm => tm.userId === user.id))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.full_name || user.email}
                              </span>
                              {user.full_name && user.email && (
                                <span className="text-sm text-muted-foreground">
                                  {user.email}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Members List */}
              {teamMembers.length > 0 && (
                <div className="space-y-3">
                  <Label>Team Members & Responsibilities</Label>
                  {teamMembers.map((member) => (
                    <div key={member.userId} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamMember(member.userId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Enter their responsibility/role..."
                        value={member.responsibility}
                        onChange={(e) => updateTeamMemberResponsibility(member.userId, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Notification Preferences */}
              {teamMembers.length > 0 && (
                <div className="space-y-3">
                  <Label>Notification Method</Label>
                  <RadioGroup 
                    value={notificationMethod} 
                    onValueChange={(value: 'email' | 'sms') => setNotificationMethod(value)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sms" id="sms" />
                      <Label htmlFor="sms">SMS/Text</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Custom Message */}
              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="notificationMessage">Custom Message (Optional)</Label>
                  <Textarea
                    id="notificationMessage"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Add a personal message to the notification..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Appointment Scheduling Section */}
            {teamMembers.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Schedule Appointments with Team
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Schedule individual planning meetings with team members
                      </p>
                    </div>
                    <Switch
                      checked={requiresAppointments}
                      onCheckedChange={setRequiresAppointments}
                    />
                  </div>
                </div>

                {requiresAppointments && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Appointment Date */}
                      <div className="space-y-2">
                        <Label>Appointment Date</Label>
                        <Calendar
                          mode="single"
                          selected={appointmentDate}
                          onSelect={setAppointmentDate}
                          className="rounded-md border w-full"
                          disabled={(date) => date < new Date()}
                        />
                      </div>

                      {/* Appointment Details */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="appointmentTime">Time</Label>
                          <Input
                            id="appointmentTime"
                            type="time"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                            placeholder="Select time"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="appointmentDuration">Duration (minutes)</Label>
                          <Select 
                            value={appointmentDuration.toString()} 
                            onValueChange={(value) => setAppointmentDuration(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="90">1.5 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="appointmentType">Appointment Type</Label>
                          <Select value={appointmentType} onValueChange={setAppointmentType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planning">Event Planning</SelectItem>
                              <SelectItem value="coordination">Coordination Meeting</SelectItem>
                              <SelectItem value="briefing">Role Briefing</SelectItem>
                              <SelectItem value="preparation">Event Preparation</SelectItem>
                              <SelectItem value="general">General Discussion</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="appointmentDescription">Meeting Description</Label>
                          <Textarea
                            id="appointmentDescription"
                            value={appointmentDescription}
                            onChange={(e) => setAppointmentDescription(e.target.value)}
                            placeholder="Describe the purpose of these appointments..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    {appointmentDate && appointmentTime && (
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Appointments will be scheduled for:
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {appointmentDate.toLocaleDateString()} at {appointmentTime} ({appointmentDuration} min each) with {teamMembers.length} team member{teamMembers.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* General User Notifications Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Additional User Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select additional users to notify about this event (not team members)
                </p>
                <UserPicker
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};