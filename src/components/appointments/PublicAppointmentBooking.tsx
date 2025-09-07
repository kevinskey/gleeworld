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
import { Clock, CalendarIcon, User, CheckCircle, ArrowRight, Users } from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useServiceProviders } from "@/hooks/useProviderServices";
import { useServiceProviders as useProviders, useProviderAvailability } from "@/hooks/useServiceProviders";

const bookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  service: z.string().min(1, "Service is required"),
  provider: z.string().optional(),
  purpose: z.string().min(1, "Purpose is required"),
  notes: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface TimeSlot {
  time: string;
  available: boolean;
}

export const PublicAppointmentBooking = () => {
  const [currentStep, setCurrentStep] = useState<'service' | 'calendar' | 'details' | 'auth' | 'confirmation'>('service');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: providers = [], isLoading: providersLoading } = useProviders();
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const { data: serviceProviders = [] } = useServiceProviders(selectedService || undefined);
  const { data: providerAvailability = [] } = useProviderAvailability(selectedProvider || undefined);

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      provider: "",
      purpose: "",
      notes: "",
    },
  });

  // Generate time slots for selected date based on provider availability
  const generateTimeSlots = async (date: Date) => {
    if (!date) return;

    // Get existing appointments for this date
    const { data: existingAppointments } = await supabase
      .from('gw_appointments')
      .select('appointment_date, duration_minutes, provider_id')
      .gte('appointment_date', startOfDay(date).toISOString())
      .lte('appointment_date', endOfDay(date).toISOString())
      .neq('status', 'cancelled');

    const slots: TimeSlot[] = [];
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // If a provider is selected, use their availability
    if (selectedProvider && providerAvailability.length > 0) {
      const todayAvailability = providerAvailability.filter(
        avail => avail.day_of_week === dayOfWeek && avail.is_available
      );

      if (todayAvailability.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Generate slots based on provider availability
      todayAvailability.forEach(availability => {
        const [startHour, startMinute] = availability.start_time.split(':').map(Number);
        const [endHour, endMinute] = availability.end_time.split(':').map(Number);
        
        const slotDuration = availability.slot_duration_minutes;
        const breakBetween = availability.break_between_slots_minutes;
        
        let currentTime = new Date(date);
        currentTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(date);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        while (currentTime < endTime) {
          const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60000);
          
          if (slotEndTime > endTime) break;
          
          const timeString = format(currentTime, 'h:mm a');
          
          // Check if slot conflicts with existing appointments for this provider
          const isAvailable = !existingAppointments?.some(apt => {
            if (selectedProvider && apt.provider_id !== selectedProvider) return false;
            
            const aptStart = new Date(apt.appointment_date);
            const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
            const newSlotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
            
            return (currentTime < aptEnd && newSlotEnd > aptStart);
          });

          // Only show future slots (at least 1 hour from now)
          const now = new Date();
          const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          if (currentTime > oneHourFromNow) {
            slots.push({ time: timeString, available: isAvailable });
          }
          
          // Move to next slot
          currentTime = new Date(currentTime.getTime() + (slotDuration + breakBetween) * 60000);
        }
      });
    } else {
      // Default business hours if no provider selected (fallback)
      const duration = 30; // Default slot duration
      
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += duration) {
          const currentTime = new Date(date);
          currentTime.setHours(hour, minute, 0, 0);
          
          const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
          
          if (slotEndTime.getHours() >= 17) continue;
          
          const timeString = format(currentTime, 'h:mm a');
          
          // Check availability against all appointments if no provider selected
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
    }

    setAvailableSlots(slots);
  };

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate, selectedProvider, providerAvailability]);

  const handleServiceSelection = () => {
    if (!selectedService) {
      toast({
        title: "Service Required",
        description: "Please select a service",
        variant: "destructive"
      });
      return;
    }
    form.setValue('service', selectedService);
    if (selectedProvider) {
      form.setValue('provider', selectedProvider);
    }
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
        title: 'Service Appointment',
        description: data.purpose,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: 30,
        appointment_type: 'Service',
        service_id: data.service,
        provider_id: data.provider || null,
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

      // Send SMS notifications
      try {
        // Send SMS to your specific number for approval
        const adminPhone = '+14706221392';
        
        await supabase.functions.invoke('gw-send-sms', {
          body: {
            to: adminPhone,
            message: `New appointment request from ${data.name} for ${format(appointmentDateTime, 'PPP')} at ${selectedTime}. Type: ${data.purpose}. Reply APPROVE ${appointment.id} or DENY ${appointment.id}`
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
    setCurrentStep('service');
    setSelectedDate(undefined);
    setSelectedTime("");
    setSelectedService("");
    setSelectedProvider("");
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
            {['service', 'calendar', 'details', currentStep === 'auth' ? 'auth' : 'confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  ['service', 'calendar', 'details'].indexOf(currentStep) >= index || currentStep === 'confirmation'
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {['service', 'calendar', 'details'].indexOf(currentStep) > index || currentStep === 'confirmation' ? (
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

        {/* Step 1: Service & Provider Selection */}
        {currentStep === 'service' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Select Service & Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Service Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Choose a Service</label>
                  {servicesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {services.map((service) => (
                        <Button
                          key={service.id}
                          variant={selectedService === service.id ? "default" : "outline"}
                          onClick={() => setSelectedService(service.id)}
                          className="h-auto p-4 text-left justify-start"
                        >
                          <div className="w-full">
                            <div className="font-semibold">{service.name}</div>
                            <div className="text-sm opacity-70 mt-1">{service.description}</div>
                            <div className="flex items-center gap-4 text-xs mt-2">
                              <span>{service.duration_minutes} minutes</span>
                              <span>{service.price_display}</span>
                              <span className="capitalize">{service.category}</span>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Provider Selection */}
                {selectedService && serviceProviders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-3 block">Choose a Provider (Optional)</label>
                    <div className="grid gap-3">
                      {serviceProviders.map((sp) => (
                        <Button
                          key={sp.provider?.id}
                          variant={selectedProvider === sp.provider?.id ? "default" : "outline"}
                          onClick={() => {
                            setSelectedProvider(sp.provider?.id || "");
                            // Reset time selection when provider changes
                            setSelectedTime("");
                            setSelectedDate(undefined);
                          }}
                          className="h-auto p-4 text-left justify-start"
                        >
                          <div className="flex items-center space-x-3 w-full">
                            <Users className="w-6 h-6" />
                            <div>
                              <div className="font-semibold">
                                {sp.provider?.title} {sp.provider?.provider_name}
                              </div>
                              <div className="text-sm opacity-70">{sp.provider?.department}</div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleServiceSelection} disabled={!selectedService}>
                  Continue
                </Button>
              </div>
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
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Choose Any Available Date</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedProvider 
                      ? "Select a date to see available times for your chosen provider" 
                      : "Select any future date - all available days are shown below"
                    }
                  </p>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    numberOfMonths={2}
                    showOutsideDays={true}
                    className="rounded-md border"
                  />
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-3">Available Times</h3>
                  {selectedProvider && providerAvailability.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Loading provider availability...
                    </p>
                  )}
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
                          {selectedProvider 
                            ? "No available slots for this provider on this date" 
                            : "No available slots for this date"
                          }
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
                <Button variant="outline" onClick={() => setCurrentStep('service')}>
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
                          <Input type="email" placeholder="your.email@domain.com" {...field} />
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

                  {/* Service and Provider Summary */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h4 className="font-medium">Booking Summary</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Service: {services.find(s => s.id === selectedService)?.name}</div>
                      {selectedProvider && (
                        <div>Provider: {serviceProviders.find(sp => sp.provider?.id === selectedProvider)?.provider?.provider_name}</div>
                      )}
                      <div>Date: {selectedDate ? format(selectedDate, 'PPP') : 'Not selected'}</div>
                      <div>Time: {selectedTime}</div>
                    </div>
                  </div>

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