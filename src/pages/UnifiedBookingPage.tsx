import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Music, User, Mail, Phone, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ServiceCategory {
  id: string;
  name: string;
  serviceCount: number;
  services: string[];
  expanded: boolean;
}

interface BookingDetails {
  service: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  notes?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

type BookingStep = 'service' | 'datetime' | 'contact' | 'confirmation';

export default function UnifiedBookingPage() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [categories, setCategories] = useState<ServiceCategory[]>([
    {
      id: 'office-hours',
      name: 'Office Hours',
      serviceCount: 3,
      services: ['Faculty Office Hours', 'Director Office Hours', 'Advising / Q&A'],
      expanded: false
    },
    {
      id: 'lessons',
      name: 'Lessons',
      serviceCount: 3,
      services: ['Individual Voice Lesson', 'Group Lesson', 'Sectional Coaching'],
      expanded: false
    },
    {
      id: 'auditions',
      name: 'Auditions',
      serviceCount: 3,
      services: ['New Member Audition', 'Callback Audition', 'Placement Hearing'],
      expanded: false
    }
  ]);

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    service: '',
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: ''
  });

  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');

  // Auto-expand auditions if coming from reschedule email
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('service') === 'audition') {
      setCategories(prev => 
        prev.map(cat => 
          cat.id === 'auditions' 
            ? { ...cat, expanded: true }
            : cat
        )
      );
    }
  }, []);

  // Generate time slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const generateTimeSlots = (date: string) => {
    // Generate time slots from 9 AM to 5 PM in 30-minute intervals
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          available: Math.random() > 0.3 // Simulate some unavailable slots
        });
      }
    }
    setAvailableTimeSlots(slots);
  };

  const toggleCategory = (categoryId: string) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, expanded: !cat.expanded }
          : cat
      )
    );
  };

  const selectService = (service: string) => {
    setBookingDetails(prev => ({ ...prev, service }));
    setCurrentStep('datetime');
  };

  const selectDateTime = (date: string, time: string) => {
    setBookingDetails(prev => ({ ...prev, date, time }));
    setCurrentStep('contact');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Save appointment to database
      const { error } = await supabase
        .from('gw_appointments')
        .insert({
          title: `${bookingDetails.service} - ${bookingDetails.name}`,
          client_name: bookingDetails.name,
          description: bookingDetails.notes || `${bookingDetails.service} appointment`,
          appointment_date: bookingDetails.date,
          client_email: bookingDetails.email,
          client_phone: bookingDetails.phone,
          status: 'scheduled',
          appointment_type: bookingDetails.service
        });

      if (error) throw error;

      setCurrentStep('confirmation');
      
      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully scheduled.",
      });

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error booking your appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (currentStep === 'datetime') setCurrentStep('service');
    else if (currentStep === 'contact') setCurrentStep('datetime');
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {['Service', 'Date & Time', 'Contact Info', 'Confirmation'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= ['service', 'datetime', 'contact', 'confirmation'].indexOf(currentStep)
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    index <= ['service', 'datetime', 'contact', 'confirmation'].indexOf(currentStep)
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}>
                    {step}
                  </span>
                  {index < 3 && <div className="w-8 h-px bg-border mx-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Service</h1>
                <p className="text-muted-foreground">Select the type of appointment you'd like to book</p>
              </div>

              <div className="space-y-4">
                {categories.map((category) => (
                  <Card key={category.id} className="bg-card border-border">
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full p-6 flex items-center justify-between text-left hover:bg-accent/10 transition-colors rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Music className="h-5 w-5 text-secondary" />
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
                            <p className="text-sm text-muted-foreground">{category.serviceCount} Services</p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transform transition-transform ${
                            category.expanded ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>

                      {category.expanded && (
                        <div className="px-6 pb-6 space-y-3">
                          {category.services.map((service, index) => (
                            <button
                              key={index}
                              onClick={() => selectService(service)}
                              className="w-full p-4 rounded-lg border text-left transition-all hover:bg-accent/10 hover:border-accent/20 bg-muted border-border text-foreground"
                            >
                              <span className="font-medium">{service}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Select Date & Time</h1>
                  <p className="text-muted-foreground">Choose when you'd like your {bookingDetails.service}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Selection */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Select Date
                    </h3>
                    <Input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                {/* Time Selection */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Available Times
                    </h3>
                    {selectedDate ? (
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {availableTimeSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={slot.available ? "outline" : "ghost"}
                            disabled={!slot.available}
                            onClick={() => selectDateTime(selectedDate, slot.time)}
                            className="text-sm"
                          >
                            {formatTime(slot.time)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Please select a date first</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === 'contact' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Contact Information</h1>
                  <p className="text-muted-foreground">We'll use this information to confirm your appointment</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Form */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <label className="flex items-center text-sm font-medium mb-2">
                        <User className="h-4 w-4 mr-2" />
                        Full Name *
                      </label>
                      <Input
                        placeholder="Your full name"
                        value={bookingDetails.name}
                        onChange={(e) => setBookingDetails(prev => ({ ...prev, name: e.target.value }))}
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
                        value={bookingDetails.email}
                        onChange={(e) => setBookingDetails(prev => ({ ...prev, email: e.target.value }))}
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
                        value={bookingDetails.phone}
                        onChange={(e) => setBookingDetails(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Additional Notes
                      </label>
                      <textarea
                        placeholder="Any special requests or additional information..."
                        value={bookingDetails.notes}
                        onChange={(e) => setBookingDetails(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 border border-border rounded-md resize-none h-20"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Booking Summary */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Service:</span>
                        <p className="font-medium">{bookingDetails.service}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Date:</span>
                        <p className="font-medium">{formatDate(bookingDetails.date)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Time:</span>
                        <p className="font-medium">{formatTime(bookingDetails.time)}</p>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-6" 
                      onClick={handleSubmit}
                      disabled={isSubmitting || !bookingDetails.name || !bookingDetails.email || !bookingDetails.phone}
                    >
                      {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 'confirmation' && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Booking Confirmed!
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Your appointment has been successfully scheduled.
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>
                  <div className="space-y-3 text-left">
                    <div>
                      <span className="text-sm text-muted-foreground">Service:</span>
                      <p className="font-medium">{bookingDetails.service}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Date & Time:</span>
                      <p className="font-medium">
                        {formatDate(bookingDetails.date)} at {formatTime(bookingDetails.time)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Contact:</span>
                      <p className="font-medium">{bookingDetails.name}</p>
                      <p className="text-sm text-muted-foreground">{bookingDetails.email}</p>
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
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCurrentStep('service');
                    setBookingDetails({
                      service: '',
                      name: '',
                      email: '',
                      phone: '',
                      date: '',
                      time: '',
                      notes: ''
                    });
                  }}
                  className="w-full max-w-md"
                >
                  Book Another Appointment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}