// Public ticket buy page — anon-accessible, lives on the tenant subdomain
// at /concert-tickets/<slug>. Anon RLS policies on gw_events and
// gw_ticket_tiers scope reads to PUBLISHED events of the current tenant
// (resolved via the x-tenant-slug header that supabase-js adds).
//
// Submitting the buy form calls the box-office-checkout edge function,
// which creates an order + a Stripe Checkout Session on the tenant's
// Connected account (direct charge, 0% fee). We redirect the browser to
// the returned hosted-checkout URL — Stripe handles payment + redirects
// the buyer to /tickets/<access_token> on success.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Calendar, MapPin, Loader2, AlertTriangle, ArrowRight, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  venue_name: string | null;
  start_date: string;
  image_url: string | null;
  box_office_slug: string | null;
  box_office_request_max: number | null;
}

interface PublicTier {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  quantity_total: number;
  quantity_sold: number;
  sort_order: number;
}

function usePublicEvent(slug: string | undefined) {
  return useQuery<PublicEvent | null>({
    queryKey: ['public_event', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, description, venue_name, start_date, image_url, box_office_slug, box_office_request_max')
        .eq('box_office_slug', slug!)
        .eq('box_office_status', 'published')
        .maybeSingle();
      if (error) {
        console.warn('[public buy] event fetch failed', error.message);
        return null;
      }
      return data as PublicEvent | null;
    },
  });
}

function usePublicTiers(eventId: string | undefined) {
  return useQuery<PublicTier[]>({
    queryKey: ['public_tiers', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ticket_tiers')
        .select('id, event_id, name, description, price_cents, currency, quantity_total, quantity_sold, sort_order')
        .eq('event_id', eventId!)
        .order('sort_order', { ascending: true });
      if (error) {
        console.warn('[public buy] tiers fetch failed', error.message);
        return [];
      }
      return (data ?? []) as PublicTier[];
    },
  });
}

function tenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant ?? null;
}

export default function ConcertTicketsPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { data: event, isLoading } = usePublicEvent(slug);
  const { data: tiers = [] } = usePublicTiers(event?.id);

  const cancelled = searchParams.get('cancelled') === '1';

  return (
    <UniversalLayout>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {cancelled && (
          <Card>
            <CardContent className="py-4 flex items-start gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div className="text-sm">
                Your checkout was cancelled — no card was charged. Pick a tier below to try again.
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !event ? (
          <Card>
            <CardHeader>
              <CardTitle>Event not found</CardTitle>
              <CardDescription>
                Tickets aren't on sale for this event, or the link is wrong.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <EventBuy event={event} tiers={tiers} />
        )}
      </main>
    </UniversalLayout>
  );
}

function EventBuy({ event, tiers }: { event: PublicEvent; tiers: PublicTier[] }) {
  const date = new Date(event.start_date);
  const longDate = date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });

  // Selected state — defaults to first available tier when tiers load.
  const firstAvailable = tiers.find((t) => t.quantity_total - t.quantity_sold > 0) || tiers[0];
  const [tierId, setTierId] = useState<string | undefined>(firstAvailable?.id);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-default tier selection when tiers list changes (initial load race).
  if (!tierId && firstAvailable) setTierId(firstAvailable.id);

  const tier = tiers.find((t) => t.id === tierId);
  const remaining = tier ? tier.quantity_total - tier.quantity_sold : 0;
  const totalCents = tier ? tier.price_cents * quantity : 0;

  const submit = async () => {
    if (!tier) { toast.error('Pick a tier'); return; }
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('Valid email is required'); return; }
    if (quantity < 1 || quantity > remaining) { toast.error(`Pick a quantity between 1 and ${remaining}`); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-checkout', {
        body: {
          tenant_slug: tenantSlug(),
          event_slug: event.box_office_slug,
          tier_id: tier.id,
          quantity,
          buyer_email: email.trim(),
          buyer_name: name.trim(),
        },
      });
      if (error) throw new Error(error.message || 'Checkout failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No checkout URL returned');
      // Hand off to Stripe's hosted checkout.
      window.location.href = data.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start checkout';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        {event.image_url && (
          <div className="aspect-[3/1] w-full overflow-hidden rounded-t-lg bg-muted">
            <img src={event.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-rose-700">
            <Ticket className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
              Tickets on sale
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
            style={{ fontFamily: 'inherit' }}
          >
            {event.title}
          </h1>
          <CardDescription className="text-base text-foreground/80 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {longDate}</span>
            {event.venue_name && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.venue_name}</span>}
          </CardDescription>
        </CardHeader>
        {event.description && (
          <CardContent>
            <p className="whitespace-pre-line text-sm text-foreground/80">{event.description}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose your tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No ticket tiers configured yet. Check back soon.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {tiers.map((t) => {
                  const left = t.quantity_total - t.quantity_sold;
                  const soldOut = left <= 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => { setTierId(t.id); if (quantity > left) setQuantity(Math.max(1, left)); }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        soldOut ? 'border-border bg-muted/40 opacity-60 cursor-not-allowed' :
                        tierId === t.id ? 'border-primary bg-primary/5' :
                        'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                          <div className="text-xs text-muted-foreground mt-1">
                            {soldOut ? 'Sold out' : `${left} left`}
                          </div>
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          ${(t.price_cents / 100).toFixed(2)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {tier && remaining > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="buy-qty">Quantity</Label>
                      <Input
                        id="buy-qty"
                        type="number"
                        min={1}
                        max={remaining}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(remaining, parseInt(e.target.value, 10) || 1)))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Total</Label>
                      <div className="h-10 px-3 rounded-md bg-muted/40 inline-flex items-center font-semibold tabular-nums">
                        ${(totalCents / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="buy-name">Your name</Label>
                    <Input id="buy-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="buy-email">Email for your tickets</Label>
                    <Input id="buy-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <Button className="w-full" onClick={submit} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Continue to payment
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <p className="text-[11px] text-muted-foreground italic text-center">
                    Secure checkout via Stripe. You'll receive your tickets by email.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CompRequestCTA event={event} tiers={tiers} />
    </>
  );
}

// ── Comp request (Phase I) ────────────────────────────────────────────────
// Authenticated tenant members can ask for free tickets — the admin
// approves on /dashboard/box-office/event/<id>. We only render the CTA
// when (a) the event opts in (box_office_request_max != null) AND
// (b) the visitor is signed in. Anon visitors don't see it so there's
// no temptation to fake a member identity.

function useAuthedUser() {
  const [user, setUser] = useState<{ id: string; email: string | null; name: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) { setUser(null); return; }
      const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
      setUser({
        id: u.id,
        email: u.email ?? null,
        name: (meta.full_name || meta.name || '').trim(),
      });
    });
  }, []);
  return user;
}

function CompRequestCTA({ event, tiers }: { event: PublicEvent; tiers: PublicTier[] }) {
  const user = useAuthedUser();
  const [open, setOpen] = useState(false);
  if (event.box_office_request_max == null) return null;
  if (!user) return null;
  return (
    <>
      <Card>
        <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            <Gift className="w-5 h-5 text-violet-700 mt-0.5" />
            <div>
              <div className="font-semibold">Need comp tickets?</div>
              <div className="text-sm text-muted-foreground">
                Up to {event.box_office_request_max} per person. An organizer reviews and emails you.
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Request comps
          </Button>
        </CardContent>
      </Card>
      <RequestCompDialog
        open={open}
        onClose={() => setOpen(false)}
        event={event}
        tiers={tiers}
        defaultName={user.name}
        defaultEmail={user.email ?? ''}
      />
    </>
  );
}

function RequestCompDialog({
  open, onClose, event, tiers, defaultName, defaultEmail,
}: {
  open: boolean;
  onClose: () => void;
  event: PublicEvent;
  tiers: PublicTier[];
  defaultName: string;
  defaultEmail: string;
}) {
  const max = event.box_office_request_max ?? 1;
  const [qty, setQty] = useState(1);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [tierId, setTierId] = useState<string>(tiers[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset defaults whenever the auth-driven values change (initial render
  // may not yet have them).
  useEffect(() => { if (defaultName)  setName(defaultName); }, [defaultName]);
  useEffect(() => { if (defaultEmail) setEmail(defaultEmail); }, [defaultEmail]);
  useEffect(() => { if (!tierId && tiers[0]?.id) setTierId(tiers[0].id); }, [tiers, tierId]);

  const submit = async () => {
    if (qty < 1 || qty > max) { toast.error(`Pick a quantity between 1 and ${max}`); return; }
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('Valid email is required'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-submit-request', {
        body: {
          event_id: event.id,
          tier_id: tierId || undefined,
          quantity: qty,
          requester_name: name.trim(),
          requester_email: email.trim(),
          message: message.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message || 'Could not submit');
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);
      toast.success('Request submitted — we\'ll email you when it\'s decided');
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not submit');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request comp tickets</DialogTitle>
          <DialogDescription>
            We'll email you once an organizer approves or denies it. Max {max} per request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-qty">Quantity</Label>
              <Input id="req-qty" type="number" min={1} max={max} value={qty}
                     onChange={(e) => setQty(Math.max(1, Math.min(max, parseInt(e.target.value, 10) || 1)))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-tier">Tier (preference)</Label>
              <select
                id="req-tier"
                className="w-full h-9 px-2 text-sm border rounded bg-background"
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-name">Your name</Label>
            <Input id="req-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-email">Email</Label>
            <Input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-msg">Message to the organizer (optional)</Label>
            <Textarea id="req-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder="My grandparents are visiting from out of town" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Gift className="w-4 h-4 mr-1.5" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
