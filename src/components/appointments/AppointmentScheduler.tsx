import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Clock, CalendarIcon, Phone } from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  client_name: z.string().min(1, "Name is required"),
  client_email: z.string().email("Valid email is required"),
  client_phone: z.string().min(10, "Valid phone number is required"),
  appointment_type: z.string(),
  duration_minutes: z.number().min(10).max(120),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

interface TimeSlot {
  time: string;
  available: boolean;
}

export const AppointmentScheduler = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      client_name: "",
      client_email: "",
      client_phone: "",
      appointment_type: "general",
      duration_minutes: 10,
    },
  });

  // Generate time slots for selected date with duration consideration
  const generateTimeSlots = async (date: Date, durationMinutes: number = 10) => {
    if (!date) return;

    const dayOfWeek = date.getDay();
    
    // Check availability for this day
    const { data: availability } = await supabase
      .from('gw_appointment_availability')
      .select('start_time, end_time')
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (!availability) {
      setAvailableSlots([]);
      return;
    }

    // Get existing appointments for this date
    const { data: existingAppointments } = await supabase
      .from('gw_appointments')
      .select('appointment_date, duration_minutes')
      .gte('appointment_date', startOfDay(date).toISOString())
      .lte('appointment_date', endOfDay(date).toISOString())
      .neq('status', 'cancelled');

    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = availability.start_time.split(':').map(Number);
    const [endHour, endMinute] = availability.end_time.split(':').map(Number);

    // Generate 10-minute slots
    for (let hour = startHour; hour < endHour || (hour === endHour && 0 < endMinute); hour++) {
      for (let minute = hour === startHour ? startMinute : 0; minute < 60; minute += 10) {
        if (hour === endHour && minute >= endMinute) break;

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDateTime = new Date(date);
        slotDateTime.setHours(hour, minute, 0, 0);

        // Check if the entire duration fits within availability
        const slotEndTime = new Date(slotDateTime.getTime() + durationMinutes * 60000);
        const availabilityEnd = new Date(date);
        availabilityEnd.setHours(endHour, endMinute, 0, 0);
        
        if (slotEndTime > availabilityEnd) continue;

        // Check if slot conflicts with existing appointments
        const isAvailable = !existingAppointments?.some(apt => {
          const aptStart = new Date(apt.appointment_date);
          const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
          const newSlotEnd = new Date(slotDateTime.getTime() + durationMinutes * 60000);
          
          // Check for any overlap
          return (
            (slotDateTime < aptEnd && newSlotEnd > aptStart) ||
            (aptStart < newSlotEnd && aptEnd > slotDateTime)
          );
        });

        // Only show future slots
        const now = new Date();
        if (slotDateTime > now) {
          slots.push({
            time: timeString,
            available: isAvailable,
          });
        }
      }
    }

    setAvailableSlots(slots);
  };

  useEffect(() => {
    if (selectedDate) {
      const duration = form.watch('duration_minutes') || 10;
      generateTimeSlots(selectedDate, duration);
    }
  }, [selectedDate, form.watch('duration_minutes')]);

  const onSubmit = async (data: AppointmentForm) => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const [hour, minute] = selectedTime.split(':').map(Number);
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hour, minute, 0, 0);

      // CRITICAL: Double-check for conflicts before creating appointment to prevent overbooking
      const appointmentEndTime = new Date(appointmentDateTime.getTime() + data.duration_minutes * 60000);
      
      const { data: conflictCheck } = await supabase
        .from('gw_appointments')
        .select('id, appointment_date, duration_minutes, client_name')
        .gte('appointment_date', startOfDay(selectedDate).toISOString())
        .lte('appointment_date', endOfDay(selectedDate).toISOString())
        .neq('status', 'cancelled');

      // Check for any overlapping appointments
      const hasConflict = conflictCheck?.some(apt => {
        const aptStart = new Date(apt.appointment_date);
        const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
        
        // Check for any overlap between existing appointment and new request
        return (
          (appointmentDateTime < aptEnd && appointmentEndTime > aptStart) ||
          (aptStart < appointmentEndTime && aptEnd > appointmentDateTime)
        );
      });

      if (hasConflict) {
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot has just been booked by another user. Please select a different time.",
          variant: "destructive"
        });
        // Refresh available slots to show current availability
        generateTimeSlots(selectedDate, data.duration_minutes);
        return;
      }

      // Create appointment with pending approval status
      const appointmentData = {
        title: data.title,
        description: data.description,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: data.duration_minutes,
        appointment_type: data.appointment_type,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        status: 'pending_approval',
        ...(user?.id && { created_by: user.id }),
      };

      const { data: appointment, error } = await supabase
        .from('gw_appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;

      // Send SMS notifications to both parties
      try {
        // Send confirmation SMS to client
        await supabase.functions.invoke('send-sms', {
          body: {
            to: data.client_phone,
            message: `Your appointment request for ${format(appointmentDateTime, 'PPP')} at ${selectedTime} has been submitted. You'll receive confirmation once approved.`,
            notificationId: appointment.id
          }
        });

        // Get admin phone number from dashboard settings
        const { data: adminSettings } = await supabase
          .from('dashboard_settings')
          .select('setting_value')
          .eq('setting_name', 'admin_phone')
          .single();

        const adminPhone = adminSettings?.setting_value || '+1234567890'; // Fallback number

        // Send approval SMS to admin/receiver
        await supabase.functions.invoke('send-sms', {
          body: {
            to: adminPhone,
            message: `New appointment request from ${data.client_name} for ${format(appointmentDateTime, 'PPP')} at ${selectedTime}. Reply "APPROVE ${appointment.id}" or "DENY ${appointment.id}"`,
            notificationId: appointment.id,
            isApprovalRequest: true
          }
        });
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
        // Don't fail the appointment creation if SMS fails
      }

      toast({
        title: "Success",
        description: "Appointment scheduled successfully!",
      });

      setOpen(false);
      form.reset();
      setSelectedTime("");
      const duration = form.getValues('duration_minutes') || 10;
      generateTimeSlots(selectedDate, duration);
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to schedule appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 text-xs whitespace-nowrap">
          <CalendarIcon className="h-3 w-3" />
          Schedule Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule an Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                className="rounded-md border"
              />
            </div>

            {/* Time Slots Dropdown */}
            {selectedDate && availableSlots.length > 0 && (
              <div>
                <label className="text-sm font-medium">Available Times</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {availableSlots
                      .filter(slot => slot.available)
                      .map((slot) => (
                        <SelectItem key={slot.time} value={slot.time}>
                          {slot.time}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDate && availableSlots.filter(slot => slot.available).length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No available slots for selected duration
              </div>
            )}
          </div>

          {/* Appointment Form */}
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Meeting with Director" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appointment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="member-meeting">Member Meeting</SelectItem>
                          <SelectItem value="exec-meeting">Exec Board Meeting</SelectItem>
                          <SelectItem value="voice-lesson">Voice Lesson</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="rehearsal">Rehearsal</SelectItem>
                          <SelectItem value="audition">Audition</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="20">20 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="(555) 123-4567" 
                          {...field}
                          onChange={(e) => {
                            // Format phone number as user types
                            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                            if (value.length >= 6) {
                              value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                            } else if (value.length >= 3) {
                              value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                            }
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={loading || !selectedTime}
                    className="flex-1"
                  >
                    {loading ? "Scheduling..." : "Schedule Appointment"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};