import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  getTenantSlug,
} from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PayFeeButtonProps {
  studentFeeId: string;
  /** When set, pays this single installment instead of the full remaining balance. */
  installmentId?: string;
  disabled?: boolean;
  label?: string;
  size?: 'default' | 'sm';
}

export function PayFeeButton({
  studentFeeId,
  installmentId,
  disabled,
  label = 'Pay now',
  size = 'default',
}: PayFeeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onPay = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // `apikey` and `x-tenant-slug` are not optional on a hand-rolled fetch:
      // supabase.functions.invoke() attaches both, and the gateway rejects a
      // request carrying no API key before the function ever runs. Bearer is
      // the caller's own session (the function reads the user off it) and
      // falls back to the anon key only so the request is well-formed enough
      // to come back as the function's own 401 rather than a gateway error.
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-fee-payment`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
            'x-tenant-slug': getTenantSlug(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            installmentId
              ? { studentFeeId, paymentType: 'installment', installmentId }
              : { studentFeeId, paymentType: 'full' },
          ),
        },
      );

      const body = await res.json().catch(() => ({}));
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
    <Button
      onClick={onPay}
      disabled={disabled || loading}
      size={size}
      className={size === 'sm' ? undefined : 'w-full sm:w-auto'}
    >
      {loading ? 'Loading…' : label}
    </Button>
  );
}
