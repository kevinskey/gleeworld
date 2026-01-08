import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, User, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useServices } from '@/hooks/useServices';
import { useAvailableTimeSlots } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface OfficeHoursBookingProps {
  selectedDate?: Date;
}

// Define the specific appointment types students can book
const appointmentTypes = [
  { 
    id: 'office-hours', 
    name: 'Office Hours', 
    duration: 15, 
    description: 'Quick check-in or question session with Dr. Johnson',
    icon: '📚'
  },
  { 
    id: 'lesson', 
    name: 'Private Lesson', 
    duration: 30, 
    description: 'One-on-one vocal or music instruction',
    icon: '🎵'
  },
  { 
    id: 'general-meeting', 
    name: 'General Meeting', 
    duration: 15, 
    description: 'Discuss academic, personal, or organizational matters',
    icon: '💬'
  },
];

export const OfficeHoursBooking = ({ selectedDate }: OfficeHoursBookingProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: services } = useServices();

  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  );
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

  const selectedTypeData = appointmentTypes.find(t => t.id === selectedType);

  // Map selected appointment type to a real service
  const getServiceIdForType = (typeId: string): string | null => {
    if (!typeId) return null;
    
    // Try to find a matching service from the database
    const matchingService = services?.find(s => 
      (typeId === 'office-hours' && s.name?.toLowerCase().includes('office')) ||
      (typeId === 'lesson' && (s.category?.toLowerCase().includes('coaching') || s.name?.toLowerCase().includes('lesson') || s.name?.toLowerCase().includes('teaching'))) ||
      (typeId === 'general-meeting' && s.category?.toLowerCase().includes('general'))
    );
    
    return matchingService?.id || services?.[0]?.id || null;
  };

  const resolvedServiceId = getServiceIdForType(selectedType) || '';

  // Fetch available time slots when service and date are selected
  const { data: timeSlots, isLoading: slotsLoading } = useAvailableTimeSlots(
    resolvedServiceId,
    selectedDateStr
  );

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
    if (!selectedType || !selectedDateStr || !selectedTime || !topic) {
      toast.error('Please fill in all required fields');
      return;
    }

    const serviceId = getServiceIdForType(selectedType);
    if (!serviceId) {
      toast.error('Service configuration not available. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('book_appointment', {
        p_service_id: serviceId,
        p_appointment_date: selectedDateStr,
        p_start_time: selectedTime,
        p_customer_name: profile?.full_name || user?.email || 'Student',
        p_customer_email: user?.email || '',
        p_customer_phone: null,
        p_attendee_count: 1,
        p_special_requests: `Type: ${selectedTypeData?.name}\nTopic: ${topic}${notes ? `\n\nNotes: ${notes}` : ''}`
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast.success(result.message || 'Appointment booked successfully!');
        setOpen(false);
        
        // Reset form
        setSelectedType('');
        setSelectedDateStr('');
        setSelectedTime('');
        setTopic('');
        setNotes('');
      } else {
        toast.error(result.error || 'Failed to book appointment');
      }
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast.error(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="secondary"
          size="sm"
          className="gap-2 h-9 text-sm font-medium"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Book Appointment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Appointment
          </DialogTitle>
          <DialogDescription>
            Book time for office hours, lessons, or a general meeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Appointment Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Appointment Type *</Label>
            <Select value={selectedType} onValueChange={(val) => {
              setSelectedType(val);
              setSelectedTime(''); // Reset time when type changes
            }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] bg-popover border border-border shadow-xl z-[100]">
                {appointmentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{type.icon}</span>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.duration} minutes
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeData?.description && (
              <p className="text-xs text-muted-foreground">{selectedTypeData.description}</p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date *</Label>
            <Select value={selectedDateStr} onValueChange={(val) => {
              setSelectedDateStr(val);
              setSelectedTime(''); // Reset time when date changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a date" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-xl z-[100]">
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
            <Select 
              value={selectedTime} 
              onValueChange={setSelectedTime}
              disabled={!selectedType || !selectedDateStr}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedType || !selectedDateStr 
                    ? "Select type and date first" 
                    : slotsLoading 
                      ? "Loading available times..." 
                      : "Select a time"
                } />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-xl z-[100]">
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : timeSlots && timeSlots.length > 0 ? (
                  timeSlots.map((slot: any) => (
                    <SelectItem key={slot.start_time} value={slot.start_time}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {slot.start_time} - {slot.end_time}
                        {slot.available_spots && (
                          <span className="text-xs text-muted-foreground">
                            ({slot.available_spots} spots)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No available times for this date
                  </div>
                )}
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
            <div className="bg-muted rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Booking as: <strong className="text-foreground">{profile?.full_name || user.email}</strong></span>
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
            disabled={loading || !selectedType || !selectedDateStr || !selectedTime || !topic}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              'Book Appointment'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
