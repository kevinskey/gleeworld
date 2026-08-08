// Buyer's order/tickets page — anon, token-gated at /tickets/<access_token>.
//
// Shown after Stripe Checkout success_url redirects here, and emailed to
// the buyer so they can revisit on their phone at the door. We don't read
// gw_tickets directly via RLS (that would leak every order's tokens to
// any anon caller); instead we go through the box-office-order-status
// edge function which uses service-role + the access_token as the gate.

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, AlertTriangle, Ticket } from 'lucide-react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ticketPollInterval } from './ticketPolling';

interface Order {
  id: string;
  event_id: string;
  buyer_email: string;
  buyer_name: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded' | 'failed' | 'comp';
  quantity: number;
  created_at: string;
}

interface MintedTicket {
  id: string;
  token: string;
  status: 'valid' | 'redeemed' | 'void';
  tier_name: string;
}

interface OrderEvent {
  id: string;
  title: string;
  start_date: string;
  venue_name: string | null;
  box_office_slug: string | null;
}

interface OrderStatusResponse {
  order: Order;
  tickets: MintedTicket[];
  event: OrderEvent | null;
}

function useOrderStatus(token: string | undefined) {
  return useQuery<OrderStatusResponse | null>({
    queryKey: ['ticket_order_status', token],
    enabled: !!token,
    refetchInterval: (q) =>
      ticketPollInterval(q.state.data as OrderStatusResponse | null | undefined),
    // Keep polling when the tab is backgrounded. Buyers routinely switch away
    // while Stripe confirms; without this the poll pauses and the page still
    // reads "Processing your payment" when they come back.
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('box-office-order-status', {
        body: { access_token: token! },
      });
      if (error) {
        console.warn('[tickets] status fetch failed', error.message);
        return null;
      }
      if ((data as { error?: string })?.error) return null;
      return data as OrderStatusResponse;
    },
  });
}

export default function TicketsOrderPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading } = useOrderStatus(token);
  const order = data?.order;
  const event = data?.event;
  const tickets = data?.tickets ?? [];
  const [showAgain, setShowAgain] = useState(false);

  useEffect(() => {
    if (order?.status !== 'pending') return;
    const id = setTimeout(() => setShowAgain(true), 30_000);
    return () => clearTimeout(id);
  }, [order?.status]);

  // No UniversalLayout on purpose. This is the page a buyer opens at the
  // venue door on cellular, and it needs nothing from the app shell — no
  // header, no footer, no branding fetch. Measured 2026-08-08: a signed-in
  // buyer waited 22s between the HTML landing and the page even asking for
  // the ticket, because the whole dashboard stack mounted first.
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !order ? (
          <Card>
            <CardHeader>
              <CardTitle>Order not found</CardTitle>
              <CardDescription>
                That link is wrong or has expired. Check the email we sent you for the
                correct link to your tickets.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : order.status === 'pending' ? (
          <PendingState order={order} event={event} showAgain={showAgain} />
        ) : order.status === 'paid' || order.status === 'comp' ? (
          <PaidState order={order} event={event} tickets={tickets} />
        ) : order.status === 'failed' ? (
          <FailedState event={event} />
        ) : (
          <RefundedState order={order} event={event} />
        )}
      </main>
    </div>
  );
}

function PendingState({ order, event, showAgain }: { order: Order; event: OrderEvent | null | undefined; showAgain: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-700 mb-2">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <CardTitle>Processing your payment</CardTitle>
        <CardDescription>
          Hang tight — Stripe is confirming your card. Tickets land here automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {event && (
          <p>
            <span className="font-semibold">{event.title}</span><br />
            {new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
            {event.venue_name && <> · {event.venue_name}</>}
          </p>
        )}
        <p className="text-muted-foreground">
          Total: ${(order.amount_cents / 100).toFixed(2)} {order.currency.toUpperCase()}
        </p>
        {showAgain && (
          <p className="text-xs text-muted-foreground italic pt-2 border-t">
            Taking longer than expected? Your tickets will also arrive at{' '}
            <span className="font-mono">{order.buyer_email}</span>. You can safely close
            this page and use the link in that email.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PaidState({ order, event, tickets }: { order: Order; event: OrderEvent | null | undefined; tickets: MintedTicket[] }) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle>You're in</CardTitle>
          <CardDescription>
            {order.status === 'comp'
              ? 'Complimentary tickets — show the QR codes below at the door.'
              : 'Tickets confirmed. Show the QR codes below at the door.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {event && (
            <p>
              <span className="font-semibold">{event.title}</span><br />
              {new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
              {event.venue_name && <> · {event.venue_name}</>}
            </p>
          )}
          <p className="text-muted-foreground">
            {tickets.length} ticket{tickets.length === 1 ? '' : 's'} ·
            ${(order.amount_cents / 100).toFixed(2)} {order.currency.toUpperCase()}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tickets.map((t, idx) => <TicketCard key={t.id} ticket={t} index={idx + 1} total={tickets.length} event={event} buyerName={order.buyer_name} />)}
      </div>
    </>
  );
}

function TicketCard({ ticket, index, total, event, buyerName }: {
  ticket: MintedTicket;
  index: number;
  total: number;
  event: OrderEvent | null | undefined;
  buyerName: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render the QR on the canvas. We use the canvas variant (not SVG) so
  // an iOS long-press lets the buyer save the QR to their photos / share
  // sheet, which is how they usually want to hand the code to a friend.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    QRCode.toCanvas(el, ticket.token, {
      width: 240,
      margin: 1,
      color: { dark: '#0b1220', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch((err) => console.warn('[ticket] QR render failed', err));
  }, [ticket.token]);

  const redeemed = ticket.status === 'redeemed';
  const voided = ticket.status === 'void';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{ticket.tier_name || 'Ticket'}</CardTitle>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {index} of {total}
          </span>
        </div>
        {event && (
          <CardDescription>
            {event.title}
            {event.venue_name && <> · {event.venue_name}</>}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-3">
          <div className={`inline-block p-3 rounded-lg bg-white border border-border ${redeemed || voided ? 'opacity-40 grayscale' : ''}`}>
            <canvas ref={canvasRef} aria-label={`QR code for ticket ${index}`} />
          </div>
          {redeemed && (
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-600">
              Already redeemed
            </div>
          )}
          {voided && (
            <div className="text-xs uppercase tracking-wider font-semibold text-rose-700">
              Voided
            </div>
          )}
          {buyerName && (
            <div className="text-sm text-muted-foreground">{buyerName}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FailedState({ event }: { event: OrderEvent | null | undefined }) {
  return (
    <Card>
      <CardHeader>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 text-rose-700 mb-2">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <CardTitle>Payment didn't go through</CardTitle>
        <CardDescription>Your card wasn't charged. You can try again.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {event && (
          <Button asChild>
            <Link to={`/concert-tickets/${event.box_office_slug ?? ''}`}>
              <Ticket className="w-4 h-4 mr-1.5" /> Try again
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RefundedState({ order, event }: { order: Order; event: OrderEvent | null | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Refunded</CardTitle>
        <CardDescription>
          These tickets were refunded. Reach out to the venue if you have questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Order ${(order.amount_cents / 100).toFixed(2)} {order.currency.toUpperCase()} ·{' '}
        {event?.title ?? 'Event'}
      </CardContent>
    </Card>
  );
}
