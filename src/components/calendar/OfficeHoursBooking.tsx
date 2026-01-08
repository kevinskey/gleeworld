import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, User, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

const OFFICE_HOUR_TYPES = [
  { id: 'general', name: 'General Discussion', duration: 15 },
  { id: 'academic', name: 'Academic Advising', duration: 30 },
  { id: 'performance', name: 'Performance Feedback', duration: 30 },
  { id: 'career', name: 'Career/Graduate School', duration: 30 },
  { id: 'personal', name: 'Personal Matter', duration: 20 },
];

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'
];

interface OfficeHoursBookingProps {
  selectedDate?: Date;
}

export const OfficeHoursBooking = ({ selectedDate }: OfficeHoursBookingProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();

  // Form state
  const [meetingType, setMeetingType] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  );
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

  // Generate next 14 days (weekdays only)
  const availableDates = Array.from({ length: 21 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    const dayOfWeek = date.getDay();
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM do')
    };
  }).filter(Boolean) as { value: string; label: string }[];

  const handleSubmit = async () => {
    if (!meetingType || !selectedDateStr || !selectedTime || !topic) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Parse time
      const [time, period] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      const appointmentDate = new Date(selectedDateStr);
      appointmentDate.setHours(hour, parseInt(minutes), 0, 0);

      const selectedType = OFFICE_HOUR_TYPES.find(t => t.id === meetingType);

      const appointmentData = {
        title: `Office Hours: ${selectedType?.name}`,
        description: topic,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: selectedType?.duration || 30,
        appointment_type: 'Office Hours',
        client_name: profile?.full_name || user?.email || 'Student',
        client_email: user?.email || '',
        status: 'pending_approval',
        notes: notes,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('gw_appointments')
        .insert(appointmentData);

      if (error) throw error;

      toast.success('Office hours request submitted! You will receive confirmation once approved.');
      setOpen(false);
      
      // Reset form
      setMeetingType('');
      setSelectedDateStr('');
      setSelectedTime('');
      setTopic('');
      setNotes('');
    } catch (error) {
      console.error('Error booking office hours:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          <MessageSquare className="h-4 w-4" />
          Book Office Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Office Hours
          </DialogTitle>
          <DialogDescription>
            Book time with Dr. Johnson for advising, feedback, or discussion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Meeting Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Meeting Type *</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                {OFFICE_HOUR_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <span>{type.name}</span>
                      <span className="text-xs text-muted-foreground">({type.duration} min)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date *</Label>
            <Select value={selectedDateStr} onValueChange={setSelectedDateStr}>
              <SelectTrigger>
                <SelectValue placeholder="Select a date" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map(date => (
                  <SelectItem key={date.value} value={date.value}>
                    {date.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time *</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map(time => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Topic/Purpose *</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Brief description of what you'd like to discuss"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context or questions..."
              rows={3}
            />
          </div>

          {/* User Info Display */}
          {user && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <User className="h-4 w-4" />
                <span>Booking as: <strong>{profile?.full_name || user.email}</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Submitting...' : 'Request Meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
