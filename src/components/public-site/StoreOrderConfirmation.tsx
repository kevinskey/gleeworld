// Display-only post-checkout banner for the public site (Task 3, Tenant
// Store add-on). store-checkout's success_url (Task 2) redirects the buyer
// back with `?order=<id>&t=<access_token>` in the query string; when those
// params are present we look the order up through `store-order-status`
// (the same anti-IDOR, token-gated endpoint the standalone /shop/success
// page — src/pages/StoreSuccess.tsx — already uses) and show a small
// "Payment confirmed" panel above the tenant's site content.
//
// This component never writes anything except clearing the local cart once
// the order is confirmed 'paid' — no order mutation happens here.
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { cart } from '@/features/store/cart';

type ViewState = 'checking' | 'paid' | 'still-processing' | 'error';

const MAX_POLLS = 5;
const POLL_INTERVAL_MS = 2000;

async function fetchOrderStatus(order: string, token: string): Promise<{ status: string } | null> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/store-order-status?order=${encodeURIComponent(order)}&t=${encodeURIComponent(token)}`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) return null;
  return { status: data.status };
}

export function StoreOrderConfirmation({ order, token }: { order: string; token: string }) {
  const [state, setState] = useState<ViewState>('checking');
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      const result = await fetchOrderStatus(order, token);
      if (cancelled) return;

      if (!result) {
        setState('error');
        return;
      }
      if (result.status === 'paid') {
        cart.clear();
        setState('paid');
        return;
      }
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLLS) {
        setState('still-processing');
        return;
      }
      setState('checking');
      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [order, token]);

  if (state === 'error') return null; // Unknown/expired link — say nothing rather than alarm a visitor.

  return (
    <div
      className="max-w-2xl mx-auto mt-6 mb-2 px-4 cq-sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 border border-border bg-card px-4 py-3 cq-sm:px-5 cq-sm:py-4">
        {state === 'paid' ? (
          <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: 'var(--site-accent)' }} />
        ) : (
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm cq-sm:text-base">
            {state === 'paid' && 'Payment confirmed'}
            {state === 'checking' && 'Confirming your payment…'}
            {state === 'still-processing' && 'Still processing'}
          </p>
          <p className="text-xs cq-sm:text-sm text-muted-foreground">
            {state === 'paid' && "Thank you for your order! A receipt has been sent to your email."}
            {state === 'checking' && "We're confirming your payment with Stripe. This usually takes a few seconds."}
            {state === 'still-processing' && "Your payment is taking longer than usual — we'll email your receipt as soon as it's ready."}
          </p>
        </div>
      </div>
    </div>
  );
}
