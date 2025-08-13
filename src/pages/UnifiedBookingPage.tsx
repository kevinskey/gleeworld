import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAvailableAuditionSlots } from '@/hooks/useAvailableAuditionSlots';
import { cn } from '@/lib/utils';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { useAuth } from '@/contexts/AuthContext';

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

export default function UnifiedBookingPage() {
  const { user, loading: authLoading } = useAuth();
  console.log('🔍 UnifiedBookingPage component loading...');
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

  // Use the existing hook for real audition data
  const { timeSlots, allTimeSlots, loading, availableDates } = useAvailableAuditionSlots(selectedDate);

  // Set the first available date by default
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

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
    if (!selectedSlot || !selectedDate) return;
    
    setIsSubmitting(true);
    
    try {
      const easternTimeZone = 'America/New_York';
      
      // Create the appointment time in Eastern Time
      const [hours, minutes] = selectedSlot.time.split(':');
      const easternDateTime = new Date(selectedDate);
      easternDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Convert Eastern Time to UTC for storage
      const utcDateTime = fromZonedTime(easternDateTime, easternTimeZone);
      
      // Check if this person already has an audition application
      const { data: existingApplication, error: checkError } = await supabase
        .from('audition_applications')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${contactInfo.name}%,email.ilike.%${contactInfo.email}%`)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Check if this person already has an audition appointment
      const { data: existingAppointment, error: appointmentCheckError } = await supabase
        .from('gw_appointments')
        .select('id, client_name, client_email')
        .eq('appointment_type', 'audition')
        .or(`client_name.ilike.%${contactInfo.name}%,client_email.ilike.%${contactInfo.email}%`)
        .maybeSingle();

      if (appointmentCheckError && appointmentCheckError.code !== 'PGRST116') {
        throw appointmentCheckError;
      }

      let isUpdate = false;

      // Update existing audition application if found
      if (existingApplication) {
        const { error: updateError } = await supabase
          .from('audition_applications')
          .update({
            audition_time_slot: utcDateTime.toISOString(),
            phone_number: contactInfo.phone,
            email: contactInfo.email,
            full_name: contactInfo.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingApplication.id);

        if (updateError) throw updateError;
        isUpdate = true;
      }

      // Update or create appointment in gw_appointments
      if (existingAppointment) {
        // Update existing appointment
        const { error: appointmentUpdateError } = await supabase
          .from('gw_appointments')
          .update({
            title: `Audition - ${contactInfo.name}`,
            client_name: contactInfo.name,
            description: `Spelman College Glee Club Audition (5 minutes) - ${selectedSlot.displayTime} EST`,
            appointment_date: selectedSlot.date,
            client_email: contactInfo.email,
            client_phone: contactInfo.phone,
            status: 'scheduled',
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
            title: `Audition - ${contactInfo.name}`,
            client_name: contactInfo.name,
            description: `Spelman College Glee Club Audition (5 minutes) - ${selectedSlot.displayTime} EST`,
            appointment_date: selectedSlot.date,
            client_email: contactInfo.email,
            client_phone: contactInfo.phone,
            status: 'scheduled',
            appointment_type: 'audition',
            duration_minutes: 5
          });

        if (appointmentError) throw appointmentError;
      }

      setIsConfirmed(true);
      
      toast({
        title: isUpdate ? "Audition Time Updated!" : "Audition Scheduled!",
        description: isUpdate 
          ? "Your audition time has been successfully updated."
          : "Your audition appointment has been confirmed.",
      });

    } catch (error) {
      console.error('Error booking audition:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error scheduling your audition. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = contactInfo.name && contactInfo.email && contactInfo.phone;

  if (isConfirmed && selectedSlot) {
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
                  Audition Confirmed!
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Your Spelman College Glee Club audition has been scheduled.
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Audition Details</h3>
                  <div className="space-y-3 text-left">
                    <div>
                      <span className="text-sm text-muted-foreground">Date & Time:</span>
                      <p className="font-medium">
                        {selectedSlot.displayDate} at {selectedSlot.displayTime}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <p className="font-medium">5 minutes</p>
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="max-w-4xl mx-auto px-4 py-16">
          
          {/* Header */}
          <div className="text-center mb-12 pt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
              Spelman College Glee Club Auditions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Schedule your 5-minute audition appointment and take the first step toward joining our celebrated musical family
            </p>
          </div>

          {!showContactForm ? (
            /* Time Selection */
            <div className="space-y-6">
              {/* Show existing booking info for authenticated users */}
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <User className="h-5 w-5 mr-2" />
                      Your Current Booking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      Already have an audition? Select a new time below to update your appointment.
                    </p>
                  </CardContent>
                </Card>
              )}
              {availableDates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Calendar className="h-5 w-5 mr-2" />
                      Select a Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {availableDates.map((date, index) => (
                        <Button
                          key={index}
                          variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                          onClick={() => setSelectedDate(date)}
                          className="p-4 h-auto"
                        >
                          {date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Clock className="h-5 w-5 mr-2" />
                      Available Times (Eastern Time) - {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                        <p className="text-muted-foreground">Loading available times...</p>
                      </div>
                    ) : allTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {allTimeSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={slot.isAvailable ? "outline" : "destructive"}
                            onClick={() => slot.isAvailable && selectTimeSlot(slot.time)}
                            disabled={!slot.isAvailable}
                            className={cn(
                              "text-xs py-3 px-2 h-auto flex flex-col items-center",
                              slot.isAvailable 
                                ? "hover:bg-primary hover:text-primary-foreground" 
                                : "bg-destructive text-destructive-foreground cursor-not-allowed opacity-90"
                            )}
                          >
                            <span className="font-medium">{slot.time}</span>
                            {!slot.isAvailable && slot.auditionerName && (
                              <span className="text-xs font-normal truncate w-full text-center mt-1">
                                {slot.auditionerName}
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No available time slots for this date.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!selectedDate && availableDates.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Audition Dates Available</h3>
                  <p className="text-muted-foreground">
                    There are currently no audition dates scheduled. Please check back later.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Contact Form */
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <p className="text-muted-foreground">
                    Selected: {selectedSlot?.displayDate} at {selectedSlot?.displayTime} EST
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="flex items-center text-sm font-medium mb-2">
                      <User className="h-4 w-4 mr-2" />
                      Full Name *
                    </label>
                    <Input
                      placeholder="Your full name"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium mb-2">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium mb-2">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone Number *
                    </label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowContactForm(false);
                        setSelectedSlot(null);
                      }}
                      className="flex-1"
                    >
                      Back to Times
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isFormValid}
                      className="flex-1"
                    >
                      {isSubmitting ? 'Scheduling...' : 'Confirm Audition'}
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