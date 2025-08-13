import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    generateAvailableSlots();
  }, []);

  const generateAvailableSlots = () => {
    const slots: TimeSlot[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Only generate slots for the 15th and 16th
    const targetDates = [15, 16];
    
    targetDates.forEach(day => {
      const date = new Date(currentYear, currentMonth, day);
      
      // Skip if date is in the past
      if (date < today) {
        return;
      }
      
      const dateString = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });

      // Friday (15th) slots: 2:30 PM - 4:30 PM (5-minute intervals)
      if (day === 15) {
        for (let minutes = 14 * 60 + 30; minutes <= 16 * 60 + 25; minutes += 5) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          const hour12 = hours > 12 ? hours - 12 : hours;
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayTime = `${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`;

          slots.push({
            date: dateString,
            time: timeString,
            available: Math.random() > 0.15, // 85% availability
            displayDate,
            displayTime
          });
        }
      }

      // Saturday (16th) slots: 11:00 AM - 1:00 PM (5-minute intervals)
      if (day === 16) {
        for (let minutes = 11 * 60; minutes <= 12 * 60 + 55; minutes += 5) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          const hour12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayTime = `${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`;

          slots.push({
            date: dateString,
            time: timeString,
            available: Math.random() > 0.15, // 85% availability
            displayDate,
            displayTime
          });
        }
      }
    });
    
    setAvailableSlots(slots); // Show all slots, both available and unavailable
  };

  const selectTimeSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowContactForm(true);
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('gw_appointments')
        .insert({
          title: `Audition - ${contactInfo.name}`,
          client_name: contactInfo.name,
          description: 'Spelman College Glee Club Audition (5 minutes)',
          appointment_date: selectedSlot.date,
          client_email: contactInfo.email,
          client_phone: contactInfo.phone,
          status: 'scheduled',
          appointment_type: 'New Member Audition',
          duration_minutes: 5
        });

      if (error) throw error;

      setIsConfirmed(true);
      
      toast({
        title: "Audition Scheduled!",
        description: "Your audition appointment has been confirmed.",
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
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Spelman College Glee Club Auditions
            </h1>
            <p className="text-lg text-muted-foreground">
              Schedule your 5-minute audition appointment
            </p>
          </div>

          {!showContactForm ? (
            /* Time Selection */
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Calendar className="h-5 w-5 mr-2" />
                    Available Audition Times
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Group slots by date */}
                    {Array.from(new Set(availableSlots.map(slot => slot.date))).map(date => {
                      const daySlots = availableSlots.filter(slot => slot.date === date);
                      const displayDate = daySlots[0]?.displayDate;
                      
                      return (
                        <div key={date} className="space-y-3">
                          <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                            {displayDate}
                          </h3>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {daySlots.map((slot, index) => (
                              <Button
                                key={`${slot.date}-${slot.time}`}
                                variant={slot.available ? "outline" : "destructive"}
                                onClick={() => slot.available && selectTimeSlot(slot)}
                                disabled={!slot.available}
                                className={slot.available 
                                  ? "text-sm py-2 hover:bg-secondary hover:text-secondary-foreground" 
                                  : "text-sm py-2 bg-destructive text-destructive-foreground cursor-not-allowed"
                                }
                              >
                                {slot.displayTime}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {availableSlots.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No available time slots at the moment.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Contact Form */
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <p className="text-muted-foreground">
                    Selected: {selectedSlot?.displayDate} at {selectedSlot?.displayTime}
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