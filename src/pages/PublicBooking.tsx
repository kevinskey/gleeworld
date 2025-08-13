import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isSameDay, startOfDay, parseISO } from 'date-fns';
import { Calendar, Clock, User, MapPin, Check, ArrowLeft, ArrowRight } from 'lucide-react';

interface TimeSlot {
  time: string;
  available: boolean;
  duration: number;
}

interface BookingFormData {
  client_name: string;
  client_email: string;
  client_phone: string;
  appointment_type: string;
  description: string;
  selectedDate: Date | null;
  selectedTime: string;
  duration: number;
}

export default function PublicBooking() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [formData, setFormData] = useState<BookingFormData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    appointment_type: '',
    description: '',
    selectedDate: null,
    selectedTime: '',
    duration: 60,
  });

  // Get available appointment types
  const { data: appointmentTypes } = useQuery({
    queryKey: ['public-appointment-types'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_appointment_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Get availability for selected date
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];

      const dayOfWeek = selectedDate.getDay();
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Get availability rules
      const { data: rules } = await supabase
        .from('gw_appointment_availability')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      // Get existing appointments for the day
      const { data: existingAppointments } = await supabase
        .from('gw_appointments')
        .select('appointment_date, duration_minutes')
        .gte('appointment_date', `${dateStr}T00:00:00`)
        .lt('appointment_date', `${dateStr}T23:59:59`)
        .neq('status', 'cancelled');

      // Generate time slots
      const timeSlots: TimeSlot[] = [];
      
      if (rules && rules.length > 0) {
        rules.forEach(rule => {
          const startTime = parseISO(`${dateStr}T${rule.start_time}`);
          const endTime = parseISO(`${dateStr}T${rule.end_time}`);
          const slotDuration = 60; // Default duration
          const bufferTime = 15; // Default buffer

          let currentTime = startTime;
          while (currentTime < endTime) {
            const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60000);
            if (slotEndTime <= endTime) {
              const timeStr = format(currentTime, 'HH:mm');
              
              // Check if slot conflicts with existing appointments
              const hasConflict = existingAppointments?.some(apt => {
                const aptStart = new Date(apt.appointment_date);
                const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
                return (
                  (currentTime >= aptStart && currentTime < aptEnd) ||
                  (slotEndTime > aptStart && slotEndTime <= aptEnd) ||
                  (currentTime <= aptStart && slotEndTime >= aptEnd)
                );
              });

              timeSlots.push({
                time: timeStr,
                available: !hasConflict,
                duration: slotDuration,
              });
            }
            currentTime = new Date(currentTime.getTime() + (slotDuration + bufferTime) * 60000);
          }
        });
      }

      return timeSlots;
    },
    enabled: !!selectedDate,
  });

  // Submit booking
  const submitBooking = useMutation({
    mutationFn: async (data: BookingFormData) => {
      if (!data.selectedDate || !data.selectedTime) {
        throw new Error('Date and time are required');
      }

      const appointmentDateTime = new Date(
        data.selectedDate.getFullYear(),
        data.selectedDate.getMonth(),
        data.selectedDate.getDate(),
        parseInt(data.selectedTime.split(':')[0]),
        parseInt(data.selectedTime.split(':')[1])
      );

      const { error } = await supabase
        .from('gw_appointments')
        .insert([{
          title: `${data.appointment_type} - ${data.client_name}`,
          description: data.description,
          appointment_date: appointmentDateTime.toISOString(),
          duration_minutes: data.duration,
          appointment_type: data.appointment_type,
          client_name: data.client_name,
          client_email: data.client_email,
          client_phone: data.client_phone,
          status: 'pending_approval',
          notes: 'Booked through public booking portal',
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentStep(4); // Success step
      toast.success('Appointment request submitted successfully!');
    },
    onError: (error) => {
      console.error('Error submitting booking:', error);
      toast.error('Failed to submit appointment request');
    },
  });

  const updateFormData = (field: keyof BookingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const isDateAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    return date >= today;
  };

  const handleSubmit = () => {
    submitBooking.mutate(formData);
  };

  const weekDays = getWeekDays(selectedWeek);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">Book an Appointment</h1>
              <p className="text-lg text-muted-foreground">
                Schedule your appointment with the Spelman College Glee Club
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[
                  { step: 1, label: 'Service' },
                  { step: 2, label: 'Date & Time' },
                  { step: 3, label: 'Details' },
                  { step: 4, label: 'Confirmation' },
                ].map(({ step, label }) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {currentStep > step ? <Check className="h-4 w-4" /> : step}
                    </div>
                    <span className="ml-2 text-sm font-medium">{label}</span>
                    {step < 4 && (
                      <ArrowRight className="ml-4 h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Card className="shadow-lg">
              <CardContent className="p-6">
                {/* Step 1: Service Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <CardHeader className="px-0 pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Select Service Type
                      </CardTitle>
                    </CardHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {appointmentTypes?.map((type) => (
                        <div
                          key={type.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            formData.appointment_type === type.name
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => {
                            updateFormData('appointment_type', type.name);
                            updateFormData('duration', type.default_duration_minutes);
                          }}
                        >
                          <h3 className="font-medium">{type.name}</h3>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                          <div className="flex items-center mt-2 text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            {type.default_duration_minutes} minutes
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => setCurrentStep(2)}
                        disabled={!formData.appointment_type}
                      >
                        Next: Select Date & Time
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Date & Time Selection */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <CardHeader className="px-0 pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Choose Date & Time
                      </CardTitle>
                    </CardHeader>

                    {/* Week Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateWeek('prev')}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="font-medium">
                        {format(selectedWeek, 'MMMM yyyy')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateWeek('next')}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 gap-2 mb-6">
                      {weekDays.map((day) => {
                        const isAvailable = isDateAvailable(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => {
                              if (isAvailable) {
                                setSelectedDate(day);
                                updateFormData('selectedDate', day);
                              }
                            }}
                            disabled={!isAvailable}
                            className={`p-3 text-center rounded-lg border transition-all ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : isAvailable
                                ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                                : 'border-border bg-muted/50 text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            <div className="text-xs">{format(day, 'EEE')}</div>
                            <div className="text-lg font-medium">{format(day, 'd')}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Slots */}
                    {selectedDate && (
                      <div>
                        <h4 className="font-medium mb-3">Available Times for {format(selectedDate, 'EEEE, MMMM d')}</h4>
                        {availabilityLoading ? (
                          <div className="text-center py-8">Loading available times...</div>
                        ) : availability && availability.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {availability.map((slot) => (
                              <button
                                key={slot.time}
                                onClick={() => {
                                  if (slot.available) {
                                    updateFormData('selectedTime', slot.time);
                                  }
                                }}
                                disabled={!slot.available}
                                className={`p-2 text-sm rounded border transition-all ${
                                  formData.selectedTime === slot.time
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : slot.available
                                    ? 'border-border hover:border-primary/50'
                                    : 'border-border bg-muted/50 text-muted-foreground cursor-not-allowed'
                                }`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No available times for this date
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setCurrentStep(3)}
                        disabled={!formData.selectedDate || !formData.selectedTime}
                      >
                        Next: Your Details
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Contact Details */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <CardHeader className="px-0 pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Your Information
                      </CardTitle>
                    </CardHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="client_name">Full Name *</Label>
                        <Input
                          id="client_name"
                          value={formData.client_name}
                          onChange={(e) => updateFormData('client_name', e.target.value)}
                          placeholder="Your full name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client_email">Email Address *</Label>
                        <Input
                          id="client_email"
                          type="email"
                          value={formData.client_email}
                          onChange={(e) => updateFormData('client_email', e.target.value)}
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client_phone">Phone Number</Label>
                        <Input
                          id="client_phone"
                          value={formData.client_phone}
                          onChange={(e) => updateFormData('client_phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Additional Information</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        placeholder="Please describe what you'd like to discuss or any specific requirements..."
                        rows={4}
                      />
                    </div>

                    {/* Booking Summary */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Booking Summary</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Service:</strong> {formData.appointment_type}</p>
                        <p><strong>Date:</strong> {formData.selectedDate && format(formData.selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                        <p><strong>Time:</strong> {formData.selectedTime}</p>
                        <p><strong>Duration:</strong> {formData.duration} minutes</p>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={
                          !formData.client_name || 
                          !formData.client_email || 
                          submitBooking.isPending
                        }
                      >
                        {submitBooking.isPending ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 4 && (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        Request Submitted Successfully!
                      </h2>
                      <p className="text-muted-foreground">
                        Thank you for your appointment request. We'll review it and send you a confirmation email within 24 hours.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">What happens next?</h3>
                      <ul className="text-sm text-left space-y-1">
                        <li>• We'll review your appointment request</li>
                        <li>• You'll receive a confirmation email within 24 hours</li>
                        <li>• If approved, the appointment will be added to your calendar</li>
                        <li>• You'll receive a reminder email before your appointment</li>
                      </ul>
                    </div>

                    <Button
                      onClick={() => {
                        setCurrentStep(1);
                        setFormData({
                          client_name: '',
                          client_email: '',
                          client_phone: '',
                          appointment_type: '',
                          description: '',
                          selectedDate: null,
                          selectedTime: '',
                          duration: 60,
                        });
                        setSelectedDate(null);
                      }}
                      className="w-full"
                    >
                      Book Another Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}