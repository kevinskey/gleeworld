import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, CheckCircle } from 'lucide-react';

const ticketRequestSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(10, 'Phone number is required').max(20),
  num_tickets: z.number().min(1, 'At least 1 ticket required').max(2, 'Maximum 2 tickets'),
  special_requests: z.string().max(500).optional(),
});

type TicketRequestFormData = z.infer<typeof ticketRequestSchema>;

export const ConcertTicketRequestForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketRequestFormData>({
    resolver: zodResolver(ticketRequestSchema),
    defaultValues: {
      num_tickets: 1,
    },
  });

  // Redirect to join as fan after countdown
  useEffect(() => {
    if (isSubmitted && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSubmitted && countdown === 0) {
      navigate('/auth?mode=signup&role=fan');
    }
  }, [isSubmitted, countdown, navigate]);

  const onSubmit = async (data: TicketRequestFormData) => {
    try {
      const { error } = await supabase.from('concert_ticket_requests').insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        num_tickets: data.num_tickets,
        special_requests: data.special_requests || null,
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your ticket request has been received. We will contact you soon!',
      });

      setIsSubmitted(true);
      reset();
    } catch (error) {
      console.error('Error submitting ticket request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ticket Request Received</h2>
          <p className="text-muted-foreground mb-4">
            Thank you! We will contact you soon regarding your ticket request.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to create your fan account in {countdown} seconds...
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/auth?mode=signup&role=fan')} className="bg-primary hover:bg-primary/90">
              Join as Fan Now
            </Button>
            <Button onClick={() => setIsSubmitted(false)} variant="outline">
              Submit Another Request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-6 h-6 text-primary" />
          <CardTitle>Concert Ticket Request</CardTitle>
        </div>
        <CardDescription>
          Request tickets to attend an upcoming Spelman College Glee Club concert
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="Your full name"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone', {
                onChange: (e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  if (cleaned.length === 0) {
                    e.target.value = '';
                  } else if (cleaned.length <= 3) {
                    e.target.value = `(${cleaned}`;
                  } else if (cleaned.length <= 6) {
                    e.target.value = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
                  } else {
                    e.target.value = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
                  }
                }
              })}
              placeholder="(555) 123-4567"
              maxLength={14}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="num_tickets">Number of Tickets *</Label>
            <Input
              id="num_tickets"
              type="number"
              min="1"
              max="2"
              {...register('num_tickets', { valueAsNumber: true })}
            />
            {errors.num_tickets && (
              <p className="text-sm text-destructive">{errors.num_tickets.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests">Special Requests (Optional)</Label>
            <Textarea
              id="special_requests"
              {...register('special_requests')}
              placeholder="Any accessibility needs or special requests"
              rows={3}
            />
            {errors.special_requests && (
              <p className="text-sm text-destructive">{errors.special_requests.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Ticket Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
