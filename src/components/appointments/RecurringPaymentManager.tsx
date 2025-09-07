import React, { useState } from 'react';
import { CreditCard, Settings, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RecurringPaymentManagerProps {
  customerEmail: string;
  appointments: any[];
}

export const RecurringPaymentManager = ({ customerEmail, appointments }: RecurringPaymentManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // Find recurring appointments for this customer
  const recurringAppointments = appointments.filter(apt => 
    apt.is_recurring && 
    apt.client_email === customerEmail &&
    apt.payment_status === 'paid'
  );

  const handleManageSubscriptions = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('appointment-customer-portal', {
        body: { customerEmail }
      });

      if (error) throw error;

      // Open Stripe customer portal in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirecting to Payment Portal",
        description: "Manage your subscriptions in the Stripe customer portal.",
      });
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Portal Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (recurringAppointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recurring Payments
          </CardTitle>
          <CardDescription>
            Manage your recurring lesson subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            You don't have any recurring lesson subscriptions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recurring Payments
        </CardTitle>
        <CardDescription>
          Manage your recurring lesson subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recurringAppointments.map((appointment) => (
          <div key={appointment.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{appointment.service}</h4>
                <p className="text-sm text-muted-foreground">
                  Weekly lessons • {appointment.duration_minutes} minutes
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${(appointment.payment_amount / 100).toFixed(2)}/week
                  </Badge>
                  <Badge variant="secondary">
                    Active Subscription
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Provider: {appointment.provider_name || 'TBA'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Next: {new Date(appointment.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <Button 
            onClick={handleManageSubscriptions} 
            disabled={isLoading}
            className="w-full flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {isLoading ? 'Opening Portal...' : 'Manage Subscriptions'}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Cancel, pause, or update your payment method through Stripe
          </p>
        </div>
      </CardContent>
    </Card>
  );
};