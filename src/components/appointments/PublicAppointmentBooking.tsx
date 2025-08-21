import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarIcon, User, CheckCircle, ArrowRight } from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const bookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  purpose: z.string().min(1, "Purpose is required"),
  notes: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface TimeSlot {
  time: string;
  available: boolean;
}

export const PublicAppointmentBooking = () => {
  const [currentStep, setCurrentStep] = useState<'type' | 'calendar' | 'details' | 'auth' | 'confirmation'>('type');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      purpose: "",
      notes: "",
    },
  });

  // Generate time slots for selected date
  const generateTimeSlots = async (date: Date) => {
    if (!date) return;

    const { data: existingAppointments } = await supabase
      .from('gw_appointments')
      .select('appointment_date, duration_minutes')
      .gte('appointment_date', startOfDay(date).toISOString())
      .lte('appointment_date', endOfDay(date).toISOString())
      .neq('status', 'cancelled');

    const slots: TimeSlot[] = [];
    const duration = 30; // 30-minute slots
    
    // Business hours: 9 AM to 5 PM
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const currentTime = new Date(date);
        currentTime.setHours(hour, minute, 0, 0);
        
        const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
        
        if (slotEndTime.getHours() >= 17) continue;
        
        const timeString = format(currentTime, 'h:mm a');
        
        // Check availability
        const isAvailable = !existingAppointments?.some(apt => {
          const aptStart = new Date(apt.appointment_date);
          const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
          const newSlotEnd = new Date(currentTime.getTime() + duration * 60000);
          
          return (currentTime < aptEnd && newSlotEnd > aptStart);
        });

        // Only show future slots
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        if (currentTime > oneHourFromNow) {
          slots.push({ time: timeString, available: isAvailable });
        }
      }
    }

    setAvailableSlots(slots);
  };

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const handleTypeSelection = () => {
    setCurrentStep('calendar');
  };

  const handleDateTimeSelection = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Selection Required",
        description: "Please select both a date and time",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep('details');
  };

  const handleDetailsSubmit = async (data: BookingForm) => {
    if (user) {
      // User is logged in, proceed with booking
      await createAppointment(data);
    } else {
      // User needs to register/login
      setCurrentStep('auth');
    }
  };

  const createAppointment = async (data: BookingForm) => {
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const [hour, minute] = selectedTime.split(':');
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(
        parseInt(hour) + (selectedTime.includes('PM') && parseInt(hour) !== 12 ? 12 : 0),
        parseInt(minute.split(' ')[0]),
        0,
        0
      );

      const appointmentData = {
        title: 'Office Hour Appointment',
        description: data.purpose,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: 30,
        appointment_type: 'Office Hour',
        client_name: data.name,
        client_email: data.email,
        client_phone: data.phone,
        status: 'pending_approval',
        notes: data.notes,
        ...(user?.id && { created_by: user.id }),
      };

      const { data: appointment, error } = await supabase
        .from('gw_appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;

      setAppointmentId(appointment.id);

      // Send SMS to the specified approval number
      try {
        await supabase.functions.invoke('gw-send-sms', {
          body: {
            to: '470-622-4845',
            message: `New appointment request from ${data.name} for ${format(appointmentDateTime, 'PPP')} at ${selectedTime}. Purpose: ${data.purpose}. Reply APPROVE ${appointment.id} or DENY ${appointment.id}`
          }
        });

        // Send confirmation SMS to client
        await supabase.functions.invoke('gw-send-sms', {
          body: {
            to: data.phone,
            message: `Your appointment request for ${format(appointmentDateTime, 'PPP')} at ${selectedTime} has been submitted. You'll receive confirmation once approved.`
          }
        });
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
      }

      setCurrentStep('confirmation');
      toast({
        title: "Appointment Requested",
        description: "Your appointment has been submitted for approval.",
      });

    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    // After successful auth, create the appointment
    const formData = form.getValues();
    createAppointment(formData);
  };

  const resetFlow = () => {
    setCurrentStep('type');
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    form.reset();
    setAppointmentId("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Book an Office Hour</h1>
          <p className="text-muted-foreground text-lg">Schedule a one-on-one consultation session</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {['type', 'calendar', 'details', currentStep === 'auth' ? 'auth' : 'confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  ['type', 'calendar', 'details'].indexOf(currentStep) >= index || currentStep === 'confirmation'
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {['type', 'calendar', 'details'].indexOf(currentStep) > index || currentStep === 'confirmation' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Appointment Type */}
        {currentStep === 'type' && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Select Appointment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleTypeSelection}
                className="w-full h-16 text-left"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-primary" />
                  <div>
                    <div className="font-semibold">Office Hour</div>
                    <div className="text-sm text-muted-foreground">One-on-one consultation session (30 min)</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Calendar Selection */}
        {currentStep === 'calendar' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Select Date & Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Choose Date</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-3">Available Times</h3>
                  {selectedDate ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {availableSlots.filter(slot => slot.available).map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          onClick={() => setSelectedTime(slot.time)}
                          className="w-full justify-start"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {slot.time}
                        </Button>
                      ))}
                      {availableSlots.filter(slot => slot.available).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No available slots for this date
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Please select a date first
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep('type')}>
                  Back
                </Button>
                <Button onClick={handleDateTimeSelection}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contact Details */}
        {currentStep === 'details' && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleDetailsSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="(555) 123-4567" 
                            {...field}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '');
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
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose of Meeting</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Academic advising, Q&A session" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any specific topics or questions you'd like to discuss..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep('calendar')}>
                      Back
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Processing...' : (user ? 'Book Appointment' : 'Continue')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Authentication (for non-logged in users) */}
        {currentStep === 'auth' && !user && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Create Account or Sign In</CardTitle>
              <p className="text-sm text-muted-foreground">
                To complete your appointment booking, please create an account or sign in.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname)}
                className="w-full"
              >
                Sign In / Create Account
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('details')}
                  className="w-full"
                >
                  Back to Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Confirmation */}
        {currentStep === 'confirmation' && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle>Appointment Requested!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">Office Hour</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDate && format(selectedDate, 'PPP')} at {selectedTime}
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p>✅ Request submitted for approval</p>
                <p>📱 SMS confirmation sent to your phone</p>
                <p>⏳ You'll receive an email once approved</p>
                <p>💰 Payment will be collected in person</p>
              </div>

              <Button onClick={resetFlow} className="w-full">
                Book Another Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};