import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PayFeeButtonProps {
  studentFeeId: string;
  disabled?: boolean;
  label?: string;
}

export function PayFeeButton({ studentFeeId, disabled, label = 'Pay now' }: PayFeeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onPay = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const res = await fetch(
        `${(supabase as unknown as { functions: { url: string } }).functions.url}/create-fee-payment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ studentFeeId, paymentType: 'full' }),
        },
      );

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Payment failed');
      window.location.href = body.url;
    } catch (e) {
      toast({
        title: 'Payment error',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onPay} disabled={disabled || loading} className="w-full sm:w-auto">
      {loading ? 'Loading…' : label}
    </Button>
  );
}
