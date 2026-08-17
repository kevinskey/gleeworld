import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, CreditCard } from 'lucide-react';

interface Summary {
  fee: {
    name: string;
    category: string;
    amount: number;
    paid_amount: number;
    remaining: number;
    due_date: string | null;
    status: string;
    student_first_name: string;
  };
  org: { name: string };
  online: boolean;
  offline: {
    methods: string[];
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  } | null;
}

const functionsUrl = () =>
  (supabase as unknown as { functions: { url: string } }).functions.url;

/**
 * Public, unauthenticated fee payment page — the link a family receives.
 * The URL's token is the capability; no login exists on this path on purpose
 * (the payer is usually a parent without an account).
 */
export default function PayFeePage() {
  const { feeId } = useParams<{ feeId: string }>();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const status = params.get('status');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!feeId || !token) {
      setError('This payment link is incomplete.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${functionsUrl()}/guest-fee-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feeId, token, action: 'summary' }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Could not load this fee.');
        setSummary(body);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [feeId, token]);

  const startCheckout = async () => {
    setPaying(true);
    try {
      const res = await fetch(`${functionsUrl()}/guest-fee-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId, token, action: 'checkout' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Payment could not be started.');
      window.location.href = body.url;
    } catch (e) {
      setError((e as Error).message);
      setPaying(false);
    }
  };

  const fee = summary?.fee;
  const isPaid = fee?.status === 'paid' || status === 'success';

  return (
    <div className="min-h-[100dvh] bg-muted/30 flex items-start sm:items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 space-y-5 bg-card">
        {error ? (
          <div className="text-center space-y-2 py-6">
            <p className="font-semibold">We couldn't open this payment link.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !summary ? (
          <div className="space-y-3 animate-pulse py-4">
            <div className="h-6 bg-muted rounded w-2/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : (
          <>
            <div>
              <div className="text-sm text-muted-foreground">{summary.org.name}</div>
              <h1 className="text-xl font-bold mt-1">{fee!.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                You're paying <span className="font-medium">{fee!.name}</span> for{' '}
                {fee!.student_first_name}.
              </p>
            </div>

            {isPaid ? (
              <div className="rounded-xl bg-primary/5 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <div className="font-semibold">Payment received — thank you!</div>
                  {status === 'success' && (
                    <div className="text-xs text-muted-foreground">
                      A receipt was emailed to the address used at checkout.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {status === 'cancelled' && (
                  <p className="text-sm rounded-lg border px-3 py-2 text-muted-foreground">
                    Checkout was cancelled — no charge was made.
                  </p>
                )}
                <div className="rounded-xl bg-primary/5 p-4">
                  <div className="text-sm text-muted-foreground">Amount due</div>
                  <div className="text-3xl font-bold">${fee!.remaining.toFixed(2)}</div>
                  {fee!.paid_amount > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ${fee!.paid_amount.toFixed(2)} of ${fee!.amount.toFixed(2)} already paid
                    </div>
                  )}
                  {fee!.due_date && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Due {new Date(fee!.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {summary.online ? (
                  <Button className="w-full" size="lg" onClick={startCheckout} disabled={paying}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {paying ? 'Opening secure checkout…' : `Pay $${fee!.remaining.toFixed(2)} now`}
                  </Button>
                ) : (
                  <div className="rounded-xl border p-4 text-sm space-y-1">
                    <div className="font-semibold">How to pay</div>
                    {summary.offline ? (
                      <>
                        <div>
                          Accepted: {summary.offline.methods.join(', ')}
                        </div>
                        {summary.offline.contact_name && <div>{summary.offline.contact_name}</div>}
                        {summary.offline.contact_email && (
                          <a
                            className="text-primary hover:underline block"
                            href={`mailto:${summary.offline.contact_email}`}
                          >
                            {summary.offline.contact_email}
                          </a>
                        )}
                        {summary.offline.contact_phone && <div>{summary.offline.contact_phone}</div>}
                      </>
                    ) : (
                      <div className="text-muted-foreground">
                        Please send payment with your student or contact the school for
                        payment options.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Secure payment link from {summary.org.name}. Questions? Reply to the
              message that sent you this link.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
