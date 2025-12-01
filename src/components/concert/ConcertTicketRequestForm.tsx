import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ticket } from 'lucide-react';

const ticketRequestSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(10, 'Phone number is required').max(20),
  num_tickets: z.number().min(1, 'At least 1 ticket required').max(10, 'Maximum 10 tickets'),
  special_requests: z.string().max(500).optional(),
});

type TicketRequestFormData = z.infer<typeof ticketRequestSchema>;

export const ConcertTicketRequestForm = () => {
  const { toast } = useToast();
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
              {...register('phone')}
              placeholder="(555) 123-4567"
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
              max="10"
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
