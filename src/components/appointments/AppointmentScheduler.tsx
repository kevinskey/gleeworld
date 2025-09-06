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
  duration_minutes: z.number().min(15).max(120), // 15 minutes to 2 hours
  is_recurring: z.boolean().default(false),
  recurrence_type: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrence_interval: z.number().min(1).max(52).default(1),
  recurrence_days_of_week: z.array(z.number().min(0).max(6)).optional(),
  recurrence_end_date: z.string().optional(),
  max_occurrences: z.number().min(1).max(100).optional(),
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
      duration_minutes: 30,
      is_recurring: false,
      recurrence_type: "weekly",
      recurrence_interval: 1,
      recurrence_days_of_week: [],
      recurrence_end_date: "",
      max_occurrences: 10,
    },
  });

  // Generate time slots for selected date based on availability settings
  const generateTimeSlots = async (date: Date, durationMinutes: number = 30) => {
    if (!date) return;

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();

    try {
      // Fetch availability slots for this day from database
      const { data: availabilitySlots, error: availabilityError } = await supabase
        .from('gw_appointment_availability')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      if (availabilityError) {
        console.error('Error fetching availability:', availabilityError);
        setAvailableSlots([]);
        return;
      }

      // If no availability slots for this day, show no time slots
      if (!availabilitySlots || availabilitySlots.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Check for existing appointments for this date
      const { data: existingAppointments } = await supabase
        .from('gw_appointments')
        .select('appointment_date, duration_minutes')
        .gte('appointment_date', startOfDay(date).toISOString())
        .lte('appointment_date', endOfDay(date).toISOString())
        .neq('status', 'cancelled');

      const slots: TimeSlot[] = [];
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Generate slots for each availability period
      for (const availability of availabilitySlots) {
        const [startHour, startMinute] = availability.start_time.split(':').map(Number);
        const [endHour, endMinute] = availability.end_time.split(':').map(Number);
        
        const periodStart = new Date(date);
        periodStart.setHours(startHour, startMinute, 0, 0);
        
        const periodEnd = new Date(date);
        periodEnd.setHours(endHour, endMinute, 0, 0);

        // Generate time slots within this availability period
        let currentTime = new Date(periodStart);
        
        while (currentTime < periodEnd) {
          const slotEndTime = new Date(currentTime.getTime() + durationMinutes * 60000);
          
          // Don't show slots that extend past the availability period
          if (slotEndTime > periodEnd) {
            break;
          }
          
          const timeString = format(currentTime, 'h:mm a');
          
          // Check if this slot conflicts with existing appointments
          const isAvailable = !existingAppointments?.some(apt => {
            const aptStart = new Date(apt.appointment_date);
            const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
            const newSlotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
            
            // Check for any overlap
            return (
              (currentTime < aptEnd && newSlotEnd > aptStart) ||
              (aptStart < newSlotEnd && aptEnd > currentTime)
            );
          });

          // Only show future slots (at least 1 hour from now)
          if (currentTime > oneHourFromNow) {
            slots.push({
              time: timeString,
              available: isAvailable,
            });
          }

          // Move to next slot
          currentTime = new Date(currentTime.getTime() + durationMinutes * 60000);
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableSlots([]);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const duration = form.watch('duration_minutes') || 30;
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

      // Create appointment data object
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

      // Check if this is a recurring appointment
      if (data.is_recurring) {
        // Use the edge function for recurring appointments
        const { data: result, error } = await supabase.functions.invoke('create-recurring-appointment', {
          body: {
            ...appointmentData,
            is_recurring: true,
            recurrence_type: data.recurrence_type,
            recurrence_interval: data.recurrence_interval,
            recurrence_days_of_week: data.recurrence_days_of_week,
            recurrence_end_date: data.recurrence_end_date,
            max_occurrences: data.max_occurrences,
          }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Created ${result.created_count} recurring appointments successfully!`,
        });
      } else {
        // Create single appointment
        const { data: appointment, error } = await supabase
          .from('gw_appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (error) throw error;

        // Send SMS notifications to both parties
        try {
          // Send confirmation SMS to client
          await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: data.client_phone,
              message: `Your appointment request for ${format(appointmentDateTime, 'PPP')} at ${selectedTime} has been submitted. You'll receive confirmation once approved.`
            }
          });

          // Send approval SMS to your specific number for approval
          const adminPhone = '+14706221392';

          // Send approval SMS to admin/receiver
          await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: adminPhone,
              message: `New appointment request from ${data.client_name} for ${format(appointmentDateTime, 'PPP')} at ${selectedTime}. Type: ${data.appointment_type}. Reply APPROVE ${appointment.id} or DENY ${appointment.id}`
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
      }

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
        <Button variant="outline" size="sm" className="gap-2 w-full h-auto min-h-[4rem] border-primary/30 hover:bg-primary/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-center">
          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">Schedule Appointment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg sm:text-xl">Schedule Appointment</DialogTitle>
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              <strong>Appointment Scheduling:</strong> Select a date and available time slot to schedule your appointment.
              Available appointment types include meetings, consultations, office hours, and more.
            </p>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Date Selection */}
          <div className="space-y-4 order-2 lg:order-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  numberOfMonths={1}
                  showOutsideDays={true}
                  className="rounded-md border w-full max-w-sm"
                />
              </div>
            </div>

            {/* Time Slots Dropdown */}
            {selectedDate && availableSlots.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Times</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
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
              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                No available slots for selected duration
              </div>
            )}
          </div>

          {/* Appointment Form */}
          <div className="order-1 lg:order-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
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
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
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
                        <Input placeholder="your.email@domain.com" {...field} />
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

                {/* Recurring Appointment Options */}
                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Recurring Appointment
                        </FormLabel>
                        <div className="text-[0.8rem] text-muted-foreground">
                          Create multiple appointments with this schedule
                        </div>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("is_recurring") && (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-medium">Recurrence Settings</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurrence_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repeat Every</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Day(s)</SelectItem>
                                <SelectItem value="weekly">Week(s)</SelectItem>
                                <SelectItem value="monthly">Month(s)</SelectItem>
                                <SelectItem value="yearly">Year(s)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurrence_interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Every</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="52" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("recurrence_type") === "weekly" && (
                      <FormField
                        control={form.control}
                        name="recurrence_days_of_week"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Days of the Week</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                                <label key={day} className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={field.value?.includes(index) || false}
                                    onChange={(e) => {
                                      const current = field.value || [];
                                      if (e.target.checked) {
                                        field.onChange([...current, index]);
                                      } else {
                                        field.onChange(current.filter(d => d !== index));
                                      }
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm">{day}</span>
                                </label>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurrence_end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_occurrences"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Occurrences</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="100" 
                                placeholder="10"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

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