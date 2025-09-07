import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppointmentServices, useAvailableSlots, useBookNewAppointment } from '@/hooks/useNewAppointments';
import { format, addDays } from 'date-fns';

export const NewAppointmentBooking = () => {
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const { data: services = [], isLoading: servicesLoading } = useAppointmentServices();
  const { data: availableSlots = [] } = useAvailableSlots(selectedService, selectedDate);
  const bookAppointment = useBookNewAppointment();

  const selectedServiceData = services.find(s => s.id === selectedService);

  // Generate next 30 days for date selection
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM do')
    };
  });

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientEmail) {
      return;
    }

    await bookAppointment.mutateAsync({
      service_id: selectedService,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      appointment_date: selectedDate,
      start_time: selectedTime,
      notes
    });

    // Reset form
    setSelectedService('');
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setNotes('');
  };

  const isFormValid = selectedService && selectedDate && selectedTime && clientName && clientEmail;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Book an Appointment</h1>
        <p className="text-muted-foreground text-lg">
          Schedule a consultation with our team
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Your Appointment
            </CardTitle>
            <CardDescription>
              Fill in your details to book an appointment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Selection */}
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex flex-col">
                        <span>{service.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {service.duration_minutes} min • ${service.price}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            {selectedService && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a date" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map(date => (
                      <SelectItem key={date.value} value={date.value}>
                        {date.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time Selection */}
            {selectedDate && (
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map(slot => (
                    <Button
                      key={slot.start_time}
                      variant={selectedTime === slot.start_time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(slot.start_time)}
                      className="text-xs"
                    >
                      {slot.start_time}
                    </Button>
                  ))}
                </div>
                {availableSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No available time slots for this date
                  </p>
                )}
              </div>
            )}

            {/* Client Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific requirements or questions..."
                    className="pl-10"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleBooking}
              disabled={!isFormValid || bookAppointment.isPending}
              className="w-full"
            >
              {bookAppointment.isPending ? 'Booking...' : 'Book Appointment'}
            </Button>
          </CardContent>
        </Card>

        {/* Service Details & Summary */}
        <div className="space-y-6">
          {/* Selected Service Info */}
          {selectedServiceData && (
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedServiceData.name}</h3>
                  <p className="text-muted-foreground">{selectedServiceData.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    {selectedServiceData.duration_minutes} minutes
                  </Badge>
                  {selectedServiceData.price && (
                    <Badge variant="secondary">
                      ${selectedServiceData.price}
                    </Badge>
                  )}
                  {selectedServiceData.location && (
                    <Badge variant="secondary">
                      {selectedServiceData.location}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Summary */}
          {isFormValid && (
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-medium">{selectedServiceData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {availableDates.find(d => d.value === selectedDate)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{selectedServiceData?.duration_minutes} minutes</span>
                </div>
                {selectedServiceData?.price && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">${selectedServiceData.price}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you need to reschedule or have questions about your appointment, 
                please contact us directly.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> appointments@example.com</p>
                <p><strong>Phone:</strong> (555) 123-4567</p>
                <p><strong>Hours:</strong> Mon-Fri 9AM-5PM</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};