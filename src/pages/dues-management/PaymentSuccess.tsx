import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentDetails {
  success: boolean;
  payment_status: string;
  payment_type: string;
  customer_email: string;
  amount: number;
  dues_record_id: string;
}

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const paymentType = searchParams.get('type');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setError('No payment session found');
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-dues-payment', {
        body: { sessionId }
      });

      if (error) throw error;

      setPaymentDetails(data);
      
      if (data.success) {
        toast({
          title: "Payment Successful!",
          description: `Your ${data.payment_type === 'full' ? 'dues payment' : 'installment payment'} has been processed successfully.`,
        });
      } else {
        setError('Payment was not completed successfully');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Failed to verify payment status');
      toast({
        title: "Verification Error",
        description: "Failed to verify payment status. Please contact support if you were charged.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we confirm your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paymentDetails) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-destructive">Payment Error</h2>
            <p className="text-muted-foreground text-center mb-6">
              {error || 'Payment verification failed'}
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/dues-management')} variant="outline">
                Back to Dues Management
              </Button>
              <Button onClick={() => window.location.href = 'mailto:support@gleeworld.org'}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              Your {paymentDetails.payment_type === 'full' ? 'dues payment' : 'installment payment'} has been processed successfully.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Payment Type</label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {paymentDetails.payment_type === 'full' ? 'Full Payment' : 'Installment Payment'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
              <p className="text-lg font-semibold">{formatCurrency(paymentDetails.amount)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {paymentDetails.payment_status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email Confirmation</label>
              <p className="text-sm text-muted-foreground">{paymentDetails.customer_email}</p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You will receive an email confirmation shortly</li>
              {paymentDetails.payment_type === 'full' ? (
                <li>• Your dues status has been updated to "Paid"</li>
              ) : (
                <li>• Your installment has been marked as paid</li>
              )}
              <li>• Your payment will be reflected in your account within 24 hours</li>
              <li>• Contact support if you have any questions</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/dues-management')} className="flex-1 sm:flex-none">
              Back to Dues Management
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 sm:flex-none">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};