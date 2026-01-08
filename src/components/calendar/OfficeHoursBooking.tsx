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

export const OfficeHoursBooking = ({ selectedDate }: OfficeHoursBookingProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: services, isLoading: servicesLoading } = useServices();

  // Form state
  const [selectedService, setSelectedService] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  );
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch available time slots when service and date are selected
  const { data: timeSlots, isLoading: slotsLoading } = useAvailableTimeSlots(
    selectedService,
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

  // Get selected service details
  const selectedServiceData = services?.find(s => s.id === selectedService);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDateStr || !selectedTime || !topic) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Use the book_appointment RPC function from the appointment module
      const { data, error } = await supabase.rpc('book_appointment', {
        p_service_id: selectedService,
        p_appointment_date: selectedDateStr,
        p_start_time: selectedTime,
        p_customer_name: profile?.full_name || user?.email || 'Student',
        p_customer_email: user?.email || '',
        p_customer_phone: null,
        p_attendee_count: 1,
        p_special_requests: `Topic: ${topic}${notes ? `\n\nNotes: ${notes}` : ''}`
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast.success(result.message || 'Appointment booked successfully!');
        setOpen(false);
        
        // Reset form
        setSelectedService('');
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

  // Filter services that are likely "Office Hours" type (you can adjust this filter)
  const officeHourServices = services?.filter(s => 
    s.category?.toLowerCase().includes('office') || 
    s.name?.toLowerCase().includes('office') ||
    s.category?.toLowerCase().includes('advising') ||
    s.category?.toLowerCase().includes('consultation') ||
    true // Show all services for now
  ) || [];

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
            Book time for office hours, advising, or consultation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Service Type *</Label>
            <Select value={selectedService} onValueChange={(val) => {
              setSelectedService(val);
              setSelectedTime(''); // Reset time when service changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder={servicesLoading ? "Loading..." : "Select service"} />
              </SelectTrigger>
              <SelectContent>
                {officeHourServices.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center gap-2">
                      <span>{service.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({service.duration_minutes} min)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedServiceData?.description && (
              <p className="text-xs text-muted-foreground">{selectedServiceData.description}</p>
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
            <Select 
              value={selectedTime} 
              onValueChange={setSelectedTime}
              disabled={!selectedService || !selectedDateStr}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedService || !selectedDateStr 
                    ? "Select service and date first" 
                    : slotsLoading 
                      ? "Loading available times..." 
                      : "Select a time"
                } />
              </SelectTrigger>
              <SelectContent>
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
            disabled={loading || !selectedService || !selectedDateStr || !selectedTime || !topic}
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
