
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { addDays, setHours, setMinutes, isPast } from 'date-fns';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { supabase } from '@/integrations/supabase/client';

interface PublicAppointmentBookingProps {
  title?: string;
  subtitle?: string;
  appointmentType?: string;
  defaultDuration?: number;
  maxDuration?: number;
  allowedDays?: number[];
  startHour?: Record<number, number>;
  endHour?: Record<number, number>;
  busyCalendarName?: string;
}

const PublicAppointmentBooking = ({
  title = "Book an Appointment",
  subtitle = "Select a date and time to book your appointment.",
  appointmentType = "general",
  defaultDuration = 30,
  maxDuration = 60,
  allowedDays = [1, 2, 3, 4, 5], // Mon-Fri by default
  startHour = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9 },
  endHour = { 1: 17, 2: 17, 3: 17, 4: 17, 5: 17 },
  busyCalendarName = "Schedule"
}: PublicAppointmentBookingProps) => {
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const { toast } = useToast();

  const timeSlots = generateTimeSlots(date);

  function generateTimeSlots(date: Date) {
    const slots = [];
    const dayOfWeek = date.getDay();
    
    if (!allowedDays.includes(dayOfWeek)) {
      return [];
    }

    const startTime = startHour[dayOfWeek] || 9;
    const endTime = endHour[dayOfWeek] || 17;
    
    let current = setHours(setMinutes(new Date(date), 0), startTime);
    const end = setHours(setMinutes(new Date(date), 0), endTime);

    while (current < end) {
      if (!isPast(current)) {
        slots.push(current);
      }
      current = new Date(current.getTime() + defaultDuration * 60000); // Add duration in milliseconds
    }
    return slots;
  }

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      console.log('Date selected:', newDate);
      setDate(newDate);
      setSelectedSlot(null); // Clear selected slot when date changes
      setIsCalendarOpen(false); // Close calendar after selection
    }
  };

  const handleSlotSelect = (slot: Date) => {
    setSelectedSlot(slot);
  };

  const handleBooking = async () => {
    if (!selectedSlot || !name || !email) return;

    try {
      setBookingLoading(true);
      
      const { error } = await supabase
        .from('gw_appointments')
        .insert({
          title: `${appointmentType} appointment with ${name}`,
          client_name: name,
          client_email: email,
          client_phone: phone,
          appointment_type: appointmentType,
          appointment_date: selectedSlot.toISOString(),
          status: 'confirmed',
          description: notes || `${appointmentType} appointment`
        });

      if (error) throw error;

      setShowSuccess(true);
      setSelectedSlot(null);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error booking your appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const getMinutes = (date: Date): number => {
    return date.getMinutes();
  };

  return (
    <div className="container mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Select Date</Label>
              <Sheet open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    id="date"
                    className="w-full justify-start text-left font-normal"
                  >
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </SheetTrigger>
                <SheetContent className="grid gap-6 p-4" side="bottom">
                  <SheetHeader>
                    <SheetTitle>Calendar</SheetTitle>
                    <SheetDescription>
                      Choose a date to book your appointment.
                    </SheetDescription>
                  </SheetHeader>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    disabled={(date) => {
                      const dayOfWeek = date.getDay();
                      return isPast(date) || !allowedDays.includes(dayOfWeek);
                    }}
                    className="rounded-md border"
                  />
                  <Button onClick={() => setIsCalendarOpen(false)}>
                    Close Calendar
                  </Button>
                </SheetContent>
              </Sheet>
            </div>

            <div>
              <Label htmlFor="time">Select Time Slot</Label>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.toISOString()}
                    variant={selectedSlot?.toISOString() === slot.toISOString() ? "secondary" : "outline"}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={isPast(slot)}
                  >
                    {format(slot, 'h:mm a')}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                type="text"
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Your Email</Label>
              <Input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Your Phone (Optional)</Label>
              <Input
                type="tel"
                id="phone"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes for your appointment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleBooking} disabled={bookingLoading || !selectedSlot || !name || !email}>
            {bookingLoading ? "Booking..." : "Book Appointment"}
          </Button>

          {showSuccess && (
            <div className="rounded-md bg-green-100 p-4">
              <h2 className="text-lg font-semibold text-green-800">Appointment Booked!</h2>
              <p className="text-sm text-green-700">
                Your appointment has been successfully booked for {selectedSlot ? format(selectedSlot, 'PPP h:mm a') : ''}.
                A confirmation email has been sent to your email address.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicAppointmentBooking;
