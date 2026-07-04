import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { cart } from "@/features/store/cart";
import { CheckCircle2, Download, ShoppingBag, AlertCircle } from "lucide-react";

// Post-checkout landing page for the GleeWorld Store (Task 6). Purely
// presentational / read-only — it never writes anything. The order id +
// access token are both in the URL (minted by store-checkout and echoed
// back in the Stripe success_url); `store-order-status` re-verifies the
// pair server-side before returning anything (see that function's header
// comment for the anti-IDOR rationale).
//
// Guests land here with no session, so this route must be public (see
// App.tsx — no ProtectedRoute wrapper).

interface Entitlement {
  product_id: string;
  download_token: string;
}

type ViewState =
  | { kind: 'checking' }
  | { kind: 'still-processing' }
  | { kind: 'paid'; entitlements: Entitlement[] }
  | { kind: 'error'; message: string };

const MAX_POLLS = 5;
const POLL_INTERVAL_MS = 2000;

async function fetchOrderStatus(order: string, token: string): Promise<{ status: string; entitlements: Entitlement[] } | null> {
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
  return { status: data.status, entitlements: Array.isArray(data.entitlements) ? data.entitlements : [] };
}

export const StoreSuccess = () => {
  const [searchParams] = useSearchParams();
  const order = searchParams.get('order');
  const token = searchParams.get('t');
  const [state, setState] = useState<ViewState>({ kind: 'checking' });
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!order || !token) {
      setState({ kind: 'error', message: "This link is missing order information. Check the link from your confirmation email." });
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      const result = await fetchOrderStatus(order, token);
      if (cancelled) return;

      if (!result) {
        setState({ kind: 'error', message: "We couldn't find that order. Check the link from your confirmation email." });
        return;
      }

      if (result.status === 'paid') {
        cart.clear();
        setState({ kind: 'paid', entitlements: result.entitlements });
        return;
      }

      // Still pending (or any other non-terminal status) — poll a few more
      // times, then settle into a "still processing" state rather than
      // spinning forever.
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLLS) {
        setState({ kind: 'still-processing' });
        return;
      }
      setState({ kind: 'checking' });
      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [order, token]);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 sm:py-16 max-w-lg">
        <Card>
          <CardHeader className="text-center space-y-3">
            {state.kind === 'paid' && <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />}
            {state.kind === 'error' && <AlertCircle className="h-10 w-10 text-destructive mx-auto" />}
            {(state.kind === 'checking' || state.kind === 'still-processing') && (
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto" />
            )}
            <CardTitle className="text-xl sm:text-2xl">
              {state.kind === 'paid' && 'Payment confirmed'}
              {state.kind === 'checking' && 'Processing…'}
              {state.kind === 'still-processing' && 'Still processing'}
              {state.kind === 'error' && 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {state.kind === 'checking' && (
              <p className="text-sm text-muted-foreground">
                We're confirming your payment with Stripe. This usually takes just a few seconds.
              </p>
            )}

            {state.kind === 'still-processing' && (
              <p className="text-sm text-muted-foreground">
                Your payment is taking longer than usual to confirm. We'll email your receipt as soon
                as it's ready — refresh this page in a minute to check again.
              </p>
            )}

            {state.kind === 'error' && (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            )}

            {state.kind === 'paid' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Thank you for your order! A receipt has been sent to your email.
                </p>
                {state.entitlements.length > 0 && (
                  <div className="space-y-2 text-left">
                    <p className="text-sm font-medium text-foreground">Your downloads</p>
                    <ul className="space-y-2">
                      {state.entitlements.map((e) => (
                        <li key={e.download_token}>
                          <a
                            href={`${SUPABASE_URL}/functions/v1/store-download?token=${encodeURIComponent(e.download_token)}`}
                            className="inline-flex items-center gap-2 text-sm text-link hover:text-link-hover underline underline-offset-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <Button asChild className="w-full" variant={state.kind === 'paid' ? 'default' : 'outline'}>
              <Link to="/shop">Continue shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};
