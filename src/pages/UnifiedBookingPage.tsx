import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, User, Mail, Phone, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProviderSelector } from '@/components/providers/ProviderSelector';
import { useServiceProviders, type ServiceProvider } from '@/hooks/useServiceProviders';

import { cn } from '@/lib/utils';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { useAuth } from '@/contexts/AuthContext';
import schedulerBackground from '@/assets/scheduler-background.png';

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
  displayDate: string;
  displayTime: string;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

interface AppointmentType {
  id: string;
  name: string;
  description: string;
  default_duration_minutes: number;
  color: string;
  is_active: boolean;
}

export default function UnifiedBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string; displayDate: string; displayTime: string } | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  // Generate available time slots for any selected date
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load appointment types on mount
  useEffect(() => {
    fetchAppointmentTypes();
  }, []);

  const fetchAppointmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_appointment_services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAppointmentTypes(data || []);
    } catch (error) {
      console.error('Error fetching appointment types:', error);
    }
  };

  // Generate time slots based on database availability settings and check existing appointments
  useEffect(() => {
    if (!selectedDate || !selectedProvider) {
      setAllTimeSlots([]);
      return;
    }

    const generateTimeSlots = async () => {
      setLoading(true);
      
      try {
        // Get day of week (0 = Sunday, 1 = Monday, etc.)
        const dayOfWeek = selectedDate.getDay();

        // Fetch availability slots for this day and provider from database
        const { data: availabilitySlots, error: availabilityError } = await supabase
          .from('gw_provider_availability')
          .select('*')
          .eq('provider_id', selectedProvider.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_available', true)
          .order('start_time', { ascending: true });

        if (availabilityError) {
          console.error('Error fetching availability:', availabilityError);
          setAllTimeSlots([]);
          setLoading(false);
          return;
        }

        // If no availability slots for this day, show no time slots
        if (!availabilitySlots || availabilitySlots.length === 0) {
          setAllTimeSlots([]);
          setLoading(false);
          return;
        }

        // Get user preferences for slot duration and buffer time
        const { data: userPrefs } = await supabase
          .from('gw_user_appointment_preferences')
          .select('buffer_time_minutes')
          .single();

        const slotDuration = 30; // Default 30 minutes
        const bufferTime = userPrefs?.buffer_time_minutes || 0;

        // Get existing appointments for this date
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('gw_appointments')
          .select('appointment_date, duration_minutes')
          .eq('provider_id', selectedProvider.id)
          .gte('appointment_date', startDate.toISOString())
          .lte('appointment_date', endDate.toISOString())
          .neq('status', 'cancelled');

        if (appointmentsError) {
          console.error('Error fetching existing appointments:', appointmentsError);
          setAllTimeSlots([]);
          setLoading(false);
          return;
        }

        console.log(`Found ${existingAppointments?.length || 0} existing appointments for ${selectedDate.toDateString()}`);
        if (existingAppointments?.length) {
          console.log('Existing appointments:', existingAppointments.map(apt => ({
            date: new Date(apt.appointment_date).toISOString(),
            duration: apt.duration_minutes
          })));
        }

        // Generate time slots from availability slots
        const timeSlots = [];
        
        for (const availabilitySlot of availabilitySlots) {
          // Parse start and end times from availability slot
          const [startHour, startMinute] = availabilitySlot.start_time.split(':').map(Number);
          const [endHour, endMinute] = availabilitySlot.end_time.split(':').map(Number);
          
          // Generate slots within this availability window
          for (let hour = startHour; hour < endHour || (hour === endHour && startMinute < endMinute); hour++) {
            const maxMinute = hour === endHour ? endMinute : 60;
            for (let minute = hour === startHour ? startMinute : 0; minute < maxMinute; minute += slotDuration) {
              const slotTime = new Date(selectedDate);
              slotTime.setHours(hour, minute, 0, 0);
              
              // Don't show past time slots for today
              const now = new Date();
              if (selectedDate.toDateString() === now.toDateString() && slotTime <= now) {
                continue;
              }

              const time12Hour = hour > 12 ? `${hour - 12}:${minute.toString().padStart(2, '0')} PM` 
                               : hour === 12 ? `12:${minute.toString().padStart(2, '0')} PM`
                               : hour === 0 ? `12:${minute.toString().padStart(2, '0')} AM`
                               : `${hour}:${minute.toString().padStart(2, '0')} AM`;
              
              // Check if this slot conflicts with existing appointments
              const isAvailable = !existingAppointments?.some(apt => {
                const aptStart = new Date(apt.appointment_date);
                const aptEnd = new Date(aptStart.getTime() + (apt.duration_minutes || slotDuration) * 60000);
                const slotEnd = new Date(slotTime.getTime() + slotDuration * 60000);
                
                // Check for overlap - any overlap makes the slot unavailable
                const hasOverlap = slotTime < aptEnd && slotEnd > aptStart;
                
                if (hasOverlap) {
                  console.log(`Slot ${time12Hour} conflicts with existing appointment:`, {
                    appointmentStart: aptStart.toISOString(),
                    appointmentEnd: aptEnd.toISOString(),
                    slotStart: slotTime.toISOString(),
                    slotEnd: slotEnd.toISOString()
                  });
                }
                
                return hasOverlap;
              });
              
              // Only add available time slots
              if (isAvailable) {
                // Check if we already have this time slot (to avoid duplicates)
                const existingSlot = timeSlots.find(slot => slot.time === time12Hour);
                if (!existingSlot) {
                  timeSlots.push({
                    time: time12Hour,
                    isAvailable: true,
                    auditionerName: null
                  });
                }
              }
            }
          }
        }
        
        // Sort time slots by time
        timeSlots.sort((a, b) => {
          const parseTime = (timeStr: string) => {
            const [time, ampm] = timeStr.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            let hour24 = hours;
            if (ampm === 'PM' && hours !== 12) hour24 += 12;
            if (ampm === 'AM' && hours === 12) hour24 = 0;
            return hour24 * 60 + minutes;
          };
          return parseTime(a.time) - parseTime(b.time);
        });
        
        setAllTimeSlots(timeSlots);
      } catch (error) {
        console.error('Error fetching appointment data:', error);
        setAllTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    generateTimeSlots();
  }, [selectedDate, selectedProvider]);

  // Restore selected time slot from localStorage when user returns from auth
  useEffect(() => {
    if (user && !authLoading) {
      const savedTimeSlot = localStorage.getItem('selectedAuditionTimeSlot');
      if (savedTimeSlot) {
        try {
          const timeSlotData = JSON.parse(savedTimeSlot);
          setSelectedSlot(timeSlotData);
          setShowContactForm(true);
          
          // Clean up localStorage
          localStorage.removeItem('selectedAuditionTimeSlot');
        } catch (error) {
          console.error('Error parsing saved time slot:', error);
          localStorage.removeItem('selectedAuditionTimeSlot');
        }
      }
    }
  }, [user, authLoading]);

  // Pre-fill contact info with user data when authenticated
  useEffect(() => {
    if (user) {
      setContactInfo({
        name: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || ''
      });
    }
  }, [user]);

  const selectTimeSlot = (time: string) => {
    if (!selectedDate) return;
    
    const dateString = selectedDate.toISOString().split('T')[0];
    const displayDate = selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const timeSlotData = {
      date: dateString,
      time,
      displayDate,
      displayTime: time
    };

    // Store selected time slot in localStorage for persistence across auth flow
    localStorage.setItem('selectedAuditionTimeSlot', JSON.stringify(timeSlotData));
    
    // Check if user is authenticated
    if (!user) {
      // Redirect to auth page with return URL
      const returnUrl = encodeURIComponent('/booking');
      window.location.href = `/auth?returnTo=${returnUrl}&timeSlot=true`;
      return;
    }
    
    // User is authenticated, proceed with normal booking
    setSelectedSlot(timeSlotData);
    setShowContactForm(true);
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !selectedDate || !selectedAppointmentType) return;
    
    setIsSubmitting(true);
    
    try {
      // Check if this service requires payment (lessons)
      const requiresPayment = selectedAppointmentType.name.toLowerCase().includes('lesson');
      
      if (requiresPayment) {
        // Create Stripe payment session for lessons
        const { data, error } = await supabase.functions.invoke('create-appointment-payment', {
          body: {
            appointmentDetails: {
              service: selectedAppointmentType.name,
              providerId: selectedProvider?.id || '',
              date: selectedSlot.date,
              time: selectedSlot.time,
              duration: selectedAppointmentType.default_duration_minutes
            },
            paymentType: 'one-time',
            clientName: contactInfo.name,
            clientEmail: contactInfo.email
          }
        });

        if (error) {
          console.error('Payment creation error:', error);
          throw new Error('Failed to create payment session');
        }

        if (data?.url) {
          // Open Stripe checkout in a new tab
          window.open(data.url, '_blank');
          
          toast({
            title: "Redirecting to Payment",
            description: "Please complete your payment in the new tab to confirm your lesson booking.",
          });
          
          return; // Exit here - appointment will be created after successful payment
        }
      }

      // For free services or if payment is not required, proceed with direct booking
      const easternTimeZone = 'America/New_York';
      
      // Parse the time from the selectedSlot.time (e.g., "6:30 PM")
      const timeMatch = selectedSlot.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        throw new Error('Invalid time format');
      }
      
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Create the appointment time in Eastern Time using the selected date
      const easternDateTime = new Date(selectedDate);
      easternDateTime.setHours(hours, minutes, 0, 0);
      
      // Convert Eastern Time to UTC for storage
      const utcDateTime = fromZonedTime(easternDateTime, easternTimeZone);
      
      // Check if this person already has an appointment
      const { data: existingAppointment, error: appointmentCheckError } = await supabase
        .from('gw_appointments')
        .select('id, client_name, client_email')
        .or(`client_name.ilike.%${contactInfo.name}%,client_email.ilike.%${contactInfo.email}%`)
        .maybeSingle();

      if (appointmentCheckError && appointmentCheckError.code !== 'PGRST116') {
        throw appointmentCheckError;
      }

      let isUpdate = false;

      // Map appointment type names to valid database constraint values
      const getValidAppointmentType = (typeName: string): string => {
        const lowerName = typeName.toLowerCase();
        switch (lowerName) {
          case 'advising':
          case 'consultation':
            return 'consultation';
          case 'lesson':
          case 'tutoring':
            return 'general';
          case 'meeting':
            return 'meeting';
          case 'audition':
            return 'audition';
          case 'rehearsal':
            return 'rehearsal';
          default:
            return 'other';
        }
      };

      const validAppointmentType = getValidAppointmentType(selectedAppointmentType.name);

      // Update or create appointment in gw_appointments
      if (existingAppointment) {
        // Update existing appointment
          const { error: appointmentUpdateError } = await supabase
            .from('gw_appointments')
            .update({
              title: `${selectedAppointmentType.name} - ${contactInfo.name}`,
              client_name: contactInfo.name,
              description: `${selectedAppointmentType.default_duration_minutes}-minute ${selectedAppointmentType.name.toLowerCase()} - ${selectedSlot.displayTime} EST`,
              appointment_date: utcDateTime.toISOString(),
              client_email: contactInfo.email,
              client_phone: contactInfo.phone,
              status: 'scheduled',
              appointment_type: validAppointmentType,
              duration_minutes: selectedAppointmentType.default_duration_minutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAppointment.id);

          if (appointmentUpdateError) throw appointmentUpdateError;
          isUpdate = true;
        } else {
          // Create new appointment
          const { error: appointmentError } = await supabase
            .from('gw_appointments')
            .insert({
              title: `${selectedAppointmentType.name} - ${contactInfo.name}`,
              client_name: contactInfo.name,
              description: `${selectedAppointmentType.default_duration_minutes}-minute ${selectedAppointmentType.name.toLowerCase()} - ${selectedSlot.displayTime} EST`,
              appointment_date: utcDateTime.toISOString(),
              client_email: contactInfo.email,
              client_phone: contactInfo.phone,
              status: 'scheduled',
              appointment_type: validAppointmentType,
              duration_minutes: selectedAppointmentType.default_duration_minutes,
              provider_id: selectedProvider?.id
            });

          if (appointmentError) throw appointmentError;
        }

      // Send SMS notification to client if phone number is provided
      if (contactInfo.phone) {
        try {
          const appointmentDateTime = new Date(utcDateTime);
          const smsMessage = `Hi ${contactInfo.name}! 🎵 Your ${selectedAppointmentType.name.toLowerCase()} appointment has been confirmed for ${selectedSlot.displayDate} at ${selectedSlot.displayTime} EST. Please arrive 5 minutes early. Looking forward to seeing you! - Dr. Johnson`;
          
          await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: contactInfo.phone,
              message: smsMessage
            }
          });
          
          // Send copy to admin
          await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: '+14706221392',
              message: `${selectedAppointmentType.name.toUpperCase()} BOOKED: ${contactInfo.name} (${contactInfo.phone}) scheduled for ${selectedSlot.displayDate} at ${selectedSlot.displayTime} EST`
            }
          });
        } catch (smsError) {
          console.error('Error sending SMS:', smsError);
          // Don't fail the booking if SMS fails
        }
      }

      setIsConfirmed(true);
      
      toast({
        title: isUpdate ? "Appointment Time Updated!" : "Appointment Scheduled!",
        description: isUpdate 
          ? "Your appointment has been successfully updated."
          : "Your appointment has been confirmed. You'll receive an SMS confirmation shortly.",
      });

      // Reset form and go back to calendar view
      setTimeout(() => {
        setShowContactForm(false);
        setSelectedSlot(null);
        setSelectedDate(null);
        setContactInfo({ name: '', email: '', phone: '' });
        setSelectedAppointmentType(null);
      }, 2000);

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error scheduling your appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = contactInfo.name && contactInfo.email && contactInfo.phone && selectedAppointmentType;

  if (isConfirmed && selectedSlot && selectedAppointmentType) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Appointment Confirmed!
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Your appointment has been scheduled successfully.
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>
                  <div className="space-y-3 text-left">
                    <div>
                      <span className="text-sm text-muted-foreground">Appointment Type:</span>
                      <p className="font-medium">{selectedAppointmentType.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Date & Time:</span>
                      <p className="font-medium">
                        {selectedSlot.displayDate} at {selectedSlot.displayTime}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <p className="font-medium">{selectedAppointmentType.default_duration_minutes} minutes</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <p className="font-medium">{contactInfo.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <p className="text-sm text-muted-foreground">{contactInfo.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="w-full max-w-md"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" 
          style={{ backgroundImage: `url(/lovable-uploads/ab597cd8-2a01-4085-9e87-e6745610d2f8.png)` }}
        ></div>
        
        <div className="relative max-w-6xl mx-auto px-2 md:px-4 py-8 bg-gradient-to-br from-primary/5 via-background to-brand-400/10">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full mb-6 shadow-xl animate-fade-in">
              <CalendarIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent mb-2 leading-tight font-dancing">
              Book an Appointment with Doc
            </h1>
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Book your office appointment or lesson here.
              </p>
            </div>
          </div>

          {!showContactForm ? (
            /* Time Selection */
            <div className="space-y-6">
              {/* Welcome Back Card for authenticated users */}
              {user && (
                <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-lg backdrop-blur-sm animate-fade-in">
                  <CardHeader className="pb-4">
                    <h2 className="flex items-center text-lg text-primary font-dancing">
                      <User className="h-5 w-5 mr-2" />
                      Welcome Back, {user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.first_name || user.email?.split('@')[0]}!
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Select a provider and time below to schedule or update your appointment.
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Provider Selection */}
              <Card className="shadow-xl border border-border/50 backdrop-blur-sm bg-card/80">
                <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 rounded-t-lg border-b border-border/50">
                  <CardTitle className="flex items-center text-xl md:text-2xl font-bold">
                    <Users className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-primary" />
                    Choose Your Provider
                  </CardTitle>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Select a provider to see their available appointment times.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <ProviderSelector
                    selectedProviderId={selectedProvider?.id}
                    onProviderSelect={setSelectedProvider}
                  />
                </CardContent>
              </Card>
              
              {selectedProvider && (
                <Card className="shadow-xl border border-border/50 backdrop-blur-sm bg-card/80 max-w-6xl mx-auto">
                  <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 rounded-t-lg border-b border-border/50 p-4 md:p-8">
                    <CardTitle className="flex items-center text-xl md:text-3xl font-bold">
                      <CalendarIcon className="h-5 w-5 md:h-8 md:w-8 mr-2 md:mr-4 text-primary" />
                      Choose Your Appointment Date (EST)
                    </CardTitle>
                    <p className="text-muted-foreground text-sm md:text-lg mt-1 md:mt-2">
                      Select any available date from the calendar below for {selectedProvider.title} {selectedProvider.provider_name}. All appointments are scheduled in Eastern Time (ET).
                    </p>
                  </CardHeader>
                <CardContent className="px-4 pb-10">
                  <div className="pt-8">
                    <div className="flex justify-center">
                      <div className="w-full max-w-5xl">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            console.log('Calendar date selected:', date);
                            console.log('Current selectedDate:', selectedDate);
                            setSelectedDate(date || null);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isDisabled = date < today;
                            console.log('Date disabled check:', date.toDateString(), 'vs today:', today.toDateString(), 'disabled:', isDisabled);
                            return isDisabled;
                          }}
                          initialFocus
                          className="pointer-events-auto border rounded-lg px-2 py-2 bg-background w-full text-lg scale-110 [&_.rdp-day]:h-8 [&_.rdp-day]:min-h-8 md:[&_.rdp-day]:h-auto md:[&_.rdp-day]:min-h-auto [&_.rdp-day_button]:h-8 [&_.rdp-day_button]:min-h-8 md:[&_.rdp-day_button]:h-auto md:[&_.rdp-day_button]:min-h-auto [&_.rdp-week]:gap-y-0 [&_.rdp-tbody]:gap-y-0 [&_tr]:leading-none [&_tbody_tr]:mb-0 [&_.rdp-week]:mb-0 [&_.rdp-table]:border-spacing-0 max-md:[&_.rdp-table]:leading-tight max-md:[&_td]:py-0 max-md:[&_tr]:h-8"
                          numberOfMonths={1}
                        />
                      </div>
                    </div>
                  </div>
                  </CardContent>
                </Card>
              )}

              {selectedDate && selectedProvider && (
                <Card className="shadow-xl border border-border/50 backdrop-blur-sm bg-card/90">
                  <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/5 rounded-t-lg border-b border-border/50">
                    <CardTitle className="flex items-center text-2xl font-bold">
                      <Clock className="h-6 w-6 mr-3 text-primary" />
                      Select Your Time Slot
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })} • Eastern Time
                    </p>
                  </CardHeader>
                  <CardContent className="p-8">
                    {loading ? (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full mb-6 animate-pulse">
                          <Clock className="h-10 w-10 text-primary animate-spin" />
                        </div>
                        <p className="text-lg text-muted-foreground">Loading available times...</p>
                      </div>
                    ) : allTimeSlots.length > 0 ? (
                      <div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                          {allTimeSlots.map((slot, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              onClick={() => selectTimeSlot(slot.time)}
                              className={cn(
                                "h-16 flex flex-col items-center justify-center space-y-1 transition-all duration-300 rounded-xl text-sm font-medium",
                                "hover:bg-gradient-to-br hover:from-primary hover:to-primary/80 hover:text-primary-foreground hover:scale-105 hover:shadow-lg border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30"
                              )}
                            >
                              <span className="font-bold">{slot.time}</span>
                              <span className="text-xs text-primary/80">Available</span>
                            </Button>
                          ))}
                        </div>
                        <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-6 border border-border/30">
                          <div className="flex items-center justify-center space-x-8 text-sm">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 bg-gradient-to-br from-primary to-primary/80 rounded-md shadow-sm"></div>
                              <span className="font-medium">Available Times</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-full mb-6">
                          <Clock className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-foreground">No Available Times</h3>
                        <p className="text-muted-foreground">
                          All time slots are booked for this date. Please select a different date.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!selectedProvider && (
                <Card className="shadow-lg">
                  <CardContent className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
                      <Users className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">Select a Provider</h3>
                    <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto">
                      Please select a provider above to view their calendar and available appointment times.
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedProvider && !selectedDate && (
                <Card className="shadow-lg">
                  <CardContent className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">Select a Date</h3>
                    <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto">
                      Please select a date from the calendar above to view available appointment times with {selectedProvider.title} {selectedProvider.provider_name}.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Contact Form */
            <div className="max-w-3xl mx-auto space-y-8">
              <Card className="shadow-xl border-2 border-primary/10">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg text-center">
                  <CardTitle className="text-2xl font-bold">Complete Your Booking</CardTitle>
                  <div className="bg-white/50 rounded-lg p-4 mt-4">
                    <p className="text-lg font-semibold text-primary">
                      {selectedSlot?.displayDate} at {selectedSlot?.displayTime} EST
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please select appointment type and provide your details
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-8">
                  <div className="space-y-2">
                    <Label htmlFor="appointmentType" className="flex items-center text-base font-semibold text-foreground">
                      <CalendarIcon className="h-5 w-5 mr-3 text-primary" />
                      Appointment Type *
                    </Label>
                    <Select 
                      value={selectedAppointmentType?.id || ''} 
                      onValueChange={(value) => {
                        const type = appointmentTypes.find(t => t.id === value);
                        setSelectedAppointmentType(type || null);
                      }}
                    >
                      <SelectTrigger className="h-12 text-base border-2 focus:border-primary">
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{type.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {type.default_duration_minutes} minutes - {type.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-base font-semibold text-foreground">
                      <User className="h-5 w-5 mr-3 text-primary" />
                      Full Name *
                    </label>
                    <Input
                      placeholder="Enter your full name"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="h-12 text-base border-2 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-base font-semibold text-foreground">
                      <Mail className="h-5 w-5 mr-3 text-primary" />
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-12 text-base border-2 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-base font-semibold text-foreground">
                      <Phone className="h-5 w-5 mr-3 text-primary" />
                      Phone Number *
                    </label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      className="h-12 text-base border-2 focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-8">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowContactForm(false);
                        setSelectedSlot(null);
                      }}
                      className="flex-1 h-12 text-base font-semibold border-2"
                    >
                      ← Back to Times
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isFormValid}
                      className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Scheduling...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Confirm Appointment</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}