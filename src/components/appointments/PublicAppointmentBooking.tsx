
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isSameDay, parseISO, isAfter, isBefore } from 'date-fns';
import { Clock, User, Mail, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';

interface PublicAppointmentBookingProps {
  title?: string;
  subtitle?: string;
  appointmentType?: string;
  defaultDuration?: number;
  maxDuration?: number;
  allowedDays?: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  startHour?: Record<number, number> | number; // Hour by day or single hour
  endHour?: Record<number, number> | number; // Hour by day or single hour
  busyCalendarName?: string;
}

export const PublicAppointmentBooking: React.FC<PublicAppointmentBookingProps> = ({
  title = "Book an Appointment",
  subtitle = "Schedule a time that works for you",
  appointmentType = "consultation",
  defaultDuration = 30,
  maxDuration = 60,
  allowedDays = [1, 2, 3, 4, 5], // Mon-Fri by default
  startHour = 9,
  endHour = 17,
  busyCalendarName
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch busy times from specified calendar
  const fetchBusyTimes = async (date: Date) => {
    if (!busyCalendarName) return [];
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: calendar } = await supabase
        .from('gw_calendars')
        .select('id')
        .eq('name', busyCalendarName)
        .single();

      if (!calendar) return [];

      const { data: events } = await supabase
        .from('gw_events')
        .select('start_date, end_date')
        .eq('calendar_id', calendar.id)
        .gte('start_date', startOfDay.toISOString())
        .lte('end_date', endOfDay.toISOString());

      return events || [];
    } catch (error) {
      console.error('Error fetching busy times:', error);
      return [];
    }
  };

  // Generate available time slots
  const generateTimeSlots = async (date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7
    
    // Check if this day is allowed
    if (!allowedDays.includes(dayOfWeek)) {
      return [];
    }

    // Get start and end hours for this day
    const dayStartHour = typeof startHour === 'object' ? startHour[dayOfWeek] || 9 : startHour;
    const dayEndHour = typeof endHour === 'object' ? endHour[dayOfWeek] || 17 : endHour;

    // Fetch busy times
    const busyEvents = await fetchBusyTimes(date);
    const busyTimes: string[] = [];

    busyEvents.forEach(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      
      // Generate 30-minute intervals that overlap with this busy time
      for (let hour = dayStartHour; hour < dayEndHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + 30);

          // Check if this slot overlaps with the busy event
          if (slotStart < end && slotEnd > start) {
            busyTimes.push(format(slotStart, 'HH:mm'));
          }
        }
      }
    });

    setBusySlots(busyTimes);

    // Generate available slots
    const slots: string[] = [];
    for (let hour = dayStartHour; hour < dayEndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if this slot or the next slots (for longer appointments) are busy
        let isSlotAvailable = true;
        for (let d = 0; d < duration; d += 30) {
          const checkHour = hour + Math.floor((minute + d) / 60);
          const checkMinute = (minute + d) % 60;
          const checkTimeString = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
          
          if (busyTimes.includes(checkTimeString) || checkHour >= dayEndHour) {
            isSlotAvailable = false;
            break;
          }
        }

        if (isSlotAvailable) {
          slots.push(timeString);
        }
      }
    }

    return slots;
  };

  // Update available slots when date or duration changes
  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      generateTimeSlots(selectedDate).then(slots => {
        setAvailableSlots(slots);
        setLoading(false);
        // Clear selected time if it's no longer available
        if (selectedTime && !slots.includes(selectedTime)) {
          setSelectedTime('');
        }
      });
    }
  }, [selectedDate, duration, busyCalendarName]);

  // Check if date should be disabled
  const isDateDisabled = (date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return !allowedDays.includes(dayOfWeek) || date < today;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !name || !email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(appointmentDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + duration);

      const { error } = await supabase
        .from('gw_appointments')
        .insert({
          name,
          email,
          appointment_type: appointmentType,
          start_time: appointmentDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration_minutes: duration,
          notes,
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success('Appointment booked successfully! You will receive a confirmation email shortly.');
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setName('');
      setEmail('');
      setNotes('');
      setDuration(defaultDuration);

    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Select Date
          </Label>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDateDisabled}
              className="rounded-md border bg-white"
            />
          </div>
        </div>

        {/* Duration Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Duration
          </Label>
          <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              {maxDuration >= 60 && <SelectItem value="60">60 minutes</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Available Times
            </Label>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading available times...</div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {availableSlots.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTime === time ? "default" : "outline"}
                    className="text-sm"
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No available times for this date. Please select another date.
              </div>
            )}
          </div>
        )}

        {/* Contact Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything specific you'd like to discuss?"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !selectedDate || !selectedTime || !name || !email}
        >
          {submitting ? 'Booking...' : 'Book Appointment'}
        </Button>
      </form>
    </div>
  );
};
