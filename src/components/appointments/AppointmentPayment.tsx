import React, { useState } from 'react';
import { CreditCard, Clock, DollarSign, Repeat } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: any) => void;
  providers: any[];
}

export const AppointmentPayment = ({ isOpen, onClose, onSuccess, providers }: AppointmentPaymentProps) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    service: 'Voice Lesson',
    providerId: '',
    date: '',
    time: '',
    duration: 30,
    paymentType: 'one-time' as 'one-time' | 'recurring'
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'details' | 'payment'>('details');

  // Calculate price based on service and duration
  const calculatePrice = () => {
    if (formData.service.toLowerCase().includes('lesson')) {
      const halfHours = formData.duration / 30;
      return 50 * halfHours;
    }
    return 0;
  };

  const price = calculatePrice();

  const handleDetailsSubmit = () => {
    if (!formData.clientName || !formData.clientEmail || !formData.providerId || !formData.date || !formData.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all appointment details.",
        variant: "destructive"
      });
      return;
    }

    if (price === 0) {
      toast({
        title: "No Payment Required",
        description: "This service type does not require payment.",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep('payment');
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-appointment-payment', {
        body: {
          appointmentDetails: {
            service: formData.service,
            providerId: formData.providerId,
            date: formData.date,
            time: formData.time,
            duration: formData.duration
          },
          paymentType: formData.paymentType,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirecting to Payment",
        description: "Complete your payment to schedule the appointment.",
      });

      // Store session ID for verification
      localStorage.setItem('pending_appointment_session', data.sessionId);
      
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientEmail: '',
      service: 'Voice Lesson',
      providerId: '',
      date: '',
      time: '',
      duration: 30,
      paymentType: 'one-time'
    });
    setCurrentStep('details');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Book & Pay for Lesson
          </DialogTitle>
          <DialogDescription>
            Payment is required before scheduling. Complete payment to confirm your appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${currentStep === 'details' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Appointment Details</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className={`flex items-center gap-2 ${currentStep === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Payment</span>
            </div>
          </div>

          {currentStep === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <Label>Service Type *</Label>
                <Select value={formData.service} onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Voice Lesson">Voice Lesson</SelectItem>
                    <SelectItem value="Piano Lesson">Piano Lesson</SelectItem>
                    <SelectItem value="Music Theory Lesson">Music Theory Lesson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Provider *</Label>
                <Select value={formData.providerId} onValueChange={(value) => setFormData(prev => ({ ...prev, providerId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.title} {provider.provider_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={formData.duration.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {price > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Lesson Cost</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${price}</p>
                        <p className="text-sm text-muted-foreground">{formData.duration} minutes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleDetailsSubmit}>
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'payment' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appointment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span className="font-medium">{formData.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="font-medium">{formData.date} at {formData.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{formData.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-medium">{formData.clientName}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-lg font-medium">Total:</span>
                    <span className="text-2xl font-bold text-green-600">${price}</span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label className="text-base font-medium">Payment Options</Label>
                <RadioGroup
                  value={formData.paymentType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value as 'one-time' | 'recurring' }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one-time" id="one-time" />
                    <Label htmlFor="one-time" className="flex items-center gap-2 cursor-pointer">
                      <Clock className="h-4 w-4" />
                      One-time payment (${price})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="recurring" />
                    <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                      <Repeat className="h-4 w-4" />
                      Weekly recurring (${price}/week)
                      <Badge variant="secondary" className="ml-2">Save time</Badge>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-muted-foreground mt-2">
                  {formData.paymentType === 'recurring' 
                    ? "Automatically bills weekly for ongoing lessons. Cancel anytime."
                    : "Pay once for this single lesson appointment."
                  }
                </p>
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setCurrentStep('details')}>
                  Back
                </Button>
                <Button 
                  onClick={handlePayment} 
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {isProcessing ? 'Processing...' : `Pay $${price} with Stripe`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};