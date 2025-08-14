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
            appointment_date: utcDateTime.toISOString(), // Use the UTC datetime instead of date string
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
            appointment_date: utcDateTime.toISOString(), // Use the UTC datetime instead of date string
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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <div className="max-w-5xl mx-auto px-4 py-12">
          
          {/* Header */}
          <div className="text-center mb-16 pt-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mb-8 shadow-lg">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-6 leading-tight">
              Spelman College Glee Club
            </h1>
            <h2 className="text-3xl font-semibold text-foreground/90 mb-4">
              Audition Booking
            </h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                Schedule your 5-minute audition appointment and take the first step toward joining our celebrated musical family
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground/80">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  5-minute sessions
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Multiple dates available
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Instant confirmation
                </div>
              </div>
            </div>
          </div>

          {!showContactForm ? (
            /* Time Selection */
            <div className="space-y-8">
              {/* Show existing booking info for authenticated users */}
              {user && (
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg text-primary">
                      <User className="h-5 w-5 mr-2" />
                      Welcome Back!
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
                <Card className="shadow-xl border-2 border-primary/10">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
                    <CardTitle className="flex items-center text-2xl font-bold">
                      <Calendar className="h-6 w-6 mr-3 text-primary" />
                      Choose Your Audition Date
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Select from available audition dates below
                    </p>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {availableDates.map((date, index) => (
                        <Button
                          key={index}
                          variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                            "p-6 h-auto text-left flex flex-col items-start space-y-2 transition-all duration-200",
                            selectedDate?.toDateString() === date.toDateString() 
                              ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                              : "hover:bg-primary/5 hover:border-primary/30 hover:scale-102"
                          )}
                        >
                          <div className="text-lg font-semibold">
                            {date.toLocaleDateString('en-US', { 
                              weekday: 'long'
                            })}
                          </div>
                          <div className="text-sm opacity-90">
                            {date.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedDate && (
                <Card className="shadow-xl border-2 border-primary/10">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
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
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                          <Clock className="h-8 w-8 text-primary animate-spin" />
                        </div>
                        <p className="text-lg text-muted-foreground">Loading available times...</p>
                      </div>
                    ) : allTimeSlots.length > 0 ? (
                      <div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                          {allTimeSlots.map((slot, index) => (
                            <Button
                              key={index}
                              variant={slot.isAvailable ? "outline" : "destructive"}
                              onClick={() => slot.isAvailable && selectTimeSlot(slot.time)}
                              disabled={!slot.isAvailable}
                              className={cn(
                                "py-4 px-3 h-auto flex flex-col items-center space-y-1 transition-all duration-200",
                                slot.isAvailable 
                                  ? "hover:bg-primary hover:text-primary-foreground hover:scale-105 border-primary/20" 
                                  : "bg-destructive/20 text-destructive border-destructive/30 cursor-not-allowed"
                              )}
                            >
                              <span className="font-semibold text-sm">{slot.time}</span>
                              {slot.isAvailable ? (
                                <span className="text-xs text-muted-foreground">Available</span>
                              ) : (
                                <span className="text-xs font-medium truncate w-full text-center">
                                  {slot.auditionerName || 'Booked'}
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-primary rounded-sm"></div>
                              <span>Available</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-destructive/20 border border-destructive/30 rounded-sm"></div>
                              <span>Booked</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-6">
                          <Clock className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Available Times</h3>
                        <p className="text-muted-foreground">
                          All time slots are booked for this date. Please select a different date.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!selectedDate && availableDates.length === 0 && (
                <Card className="shadow-lg">
                  <CardContent className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
                      <Calendar className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">No Audition Dates Available</h3>
                    <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto">
                      There are currently no audition dates scheduled. Please check back later or contact us for more information.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = '/'}>
                      Return to Home
                    </Button>
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
                      5-minute audition session
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-8">
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
                          <span>Confirm Audition</span>
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