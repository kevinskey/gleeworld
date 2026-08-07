// Concert RSVP — an inline event card plus a modal "layer" that collects the
// headcount, souvenir add-ons and buyer details, then hands off to Stripe.
//
// Two ways in, deliberately:
//   • the block's own button, and
//   • any link on the page pointing at #rsvp (a hero CTA, a nav item).
// The hash listener is what lets a site owner wire an existing hero button to
// this form without touching code.
//
// The form sends ids and quantities ONLY. Every price shown here is read from
// the same server RPC that the checkout function re-reads before charging, so
// a tampered client can misprice the summary but never the charge.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays, MapPin, Clock, Ticket, Loader2, Minus, Plus, ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  /** box_office_slug of the gw_events row this form sells. */
  eventSlug: z.string().default('retirement-concert'),
  heading: z.string().default('RSVP'),
  blurb: z.string().default(''),
  buttonLabel: z.string().default('RSVP and reserve seats'),
  /** Hide the inline card when the page already has its own CTA into #rsvp. */
  showCard: z.boolean().default(true),
  merchHeading: z.string().default('Souvenirs'),
  merchBlurb: z.string().default('Take something home from the evening. Picked up at the concert.'),
});
type Config = z.infer<typeof schema>;

interface Tier {
  id: string; name: string; description: string | null;
  price_cents: number; currency: string; remaining: number;
}
/** As synced from the TSB catalog: a swatch image and/or a hex chip. */
interface MerchColor { name: string; hex: string | null; swatch: string | null }
interface MerchItem {
  id: string; name: string; description: string | null;
  price_cents: number; currency: string;
  sizes: string[]; colors: MerchColor[];
  image_url: string | null;
}
interface EventInfo {
  id: string; title: string; description: string | null;
  start_date: string; end_date: string | null;
  venue_name: string | null; address: string | null; image_url: string | null; slug: string;
}
interface RsvpData { event: EventInfo; tiers: Tier[]; merch: MerchItem[]; error?: string }

const money = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
// Always name the zone. The timestamp is a real instant, so a guest reading
// this in California correctly sees "3:00 PM PDT" for a 6:00 PM Atlanta
// concert — without the label that just looks like the wrong time.
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

/** −/+ stepper. Kept local: the shadcn set has no numeric stepper. */
function Stepper({
  value, onChange, min = 0, max = 20, label,
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  // 44px targets through md (phones and iPad are both touch); density at lg+.
  const btn = 'w-11 h-11 lg:w-9 lg:h-9 grid place-items-center disabled:opacity-30 hover:bg-muted transition-colors';
  return (
    <div className="inline-flex items-center rounded-full border border-border overflow-hidden shrink-0">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={btn}
      >
        <Minus className="w-4 h-4" />
      </button>
      <span aria-live="polite" className="w-10 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={btn}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const [open, setOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['concert-rsvp', ctx.slug, config.eventSlug],
    queryFn: async (): Promise<RsvpData | null> => {
      const { data, error } = await supabase.rpc('gw_concert_rsvp_public_event', {
        p_tenant_slug: ctx.slug,
        p_event_slug: config.eventSlug,
      });
      if (error) throw new Error(error.message);
      return data as RsvpData | null;
    },
    enabled: Boolean(config.eventSlug),
    staleTime: 60_000,
  });

  // Open from any #rsvp link on the page (e.g. an existing hero CTA), and
  // surface a gentle note when Stripe bounced the buyer back.
  useEffect(() => {
    const sync = () => { if (window.location.hash === '#rsvp') setOpen(true); };
    sync();
    if (new URLSearchParams(window.location.search).get('rsvp') === 'cancelled') setCancelled(true);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // Clear the hash on close so the same link can re-open the layer.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next && window.location.hash === '#rsvp') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const ev = data?.event;
  const unavailable = !isLoading && (!data || data.error || !ev);

  // Price up front, and a nudge only once the room is actually filling up.
  const headlineTier = data?.tiers?.[0];
  const tierSummary = headlineTier
    ? `${money(headlineTier.price_cents)} per person${
        headlineTier.remaining <= 25 ? ` · only ${headlineTier.remaining} seats left` : ''
      }`
    : null;

  // In the editor, say why nothing renders. Publicly, stay quiet rather than
  // showing a guest an error for a misconfigured slug.
  if (unavailable) {
    if (!ctx.isPreview) return null;
    return (
      <section className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <Ticket className="w-5 h-5 mx-auto mb-2 opacity-50" />
        No published box-office event matches the slug{' '}
        <code className="px-1 rounded bg-muted">{config.eventSlug || '(unset)'}</code>.
        <br />Publish the event in Box Office, then set its slug in this block's settings.
      </section>
    );
  }

  // Full-bleed band, matching the hero's edge-to-edge width. Vertical padding
  // comes from the site's own `.gw-site > section` rule, so none is set here.
  return (
    <section id="rsvp-section" className="max-w-6xl mx-auto w-full border-y border-border bg-muted/30">
      {config.showCard && (
        <div className="px-4 cq-sm:px-6 py-10 cq-sm:py-14">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading event details…
            </div>
          ) : (
            <div className="grid gap-10 cq-lg:grid-cols-2 cq-lg:gap-16 cq-lg:items-center">
              {/* Left: what it is */}
              <div>
                {config.heading && (
                  <p
                    className="text-sm font-semibold uppercase tracking-[0.2em]"
                    style={{ color: 'var(--site-accent)' }}
                  >
                    {config.heading}
                  </p>
                )}
                <h2
                  className="mt-3 normal-case text-3xl cq-sm:text-4xl cq-lg:text-5xl font-bold tracking-tight leading-[1.1]"
                  style={{ fontFamily: 'var(--site-heading-font)' }}
                >
                  {ev!.title}
                </h2>
                {config.blurb && (
                  <p className="mt-5 text-lg text-muted-foreground max-w-2xl">{config.blurb}</p>
                )}
                {ev!.image_url && (
                  <img
                    src={ev.image_url}
                    alt=""
                    className="mt-8 w-full aspect-[21/9] object-cover"
                    style={{ borderRadius: 'var(--site-radius)' }}
                  />
                )}
              </div>

              {/* Right: when, where, and the way in */}
              <div
                className="bg-card border border-border p-6 cq-sm:p-8"
                style={{ borderRadius: 'var(--site-radius)' }}
              >
                <dl className="space-y-5">
                  <div className="flex items-start gap-4">
                    <CalendarDays className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--site-accent)' }} />
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">Date</dt>
                      <dd className="mt-0.5 text-lg font-medium">{formatDay(ev!.start_date)}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Clock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--site-accent)' }} />
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">Time</dt>
                      <dd className="mt-0.5 text-lg font-medium">{formatTime(ev!.start_date)}</dd>
                    </div>
                  </div>
                  {(ev!.venue_name || ev!.address) && (
                    <div className="flex items-start gap-4">
                      <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--site-accent)' }} />
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-muted-foreground">Location</dt>
                        <dd className="mt-0.5 text-lg font-medium">{ev!.venue_name}</dd>
                        {ev!.address && <dd className="text-muted-foreground">{ev!.address}</dd>}
                      </div>
                    </div>
                  )}
                </dl>

                <Button
                  size="lg"
                  onClick={() => handleOpenChange(true)}
                  className="mt-8 w-full font-semibold h-12 text-base"
                  style={{
                    background: 'var(--site-accent)',
                    color: 'var(--site-accent-foreground, #fff)',
                    borderRadius: 'var(--site-radius)',
                  }}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  {config.buttonLabel}
                </Button>

                {tierSummary && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">{tierSummary}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {cancelled && (
        <p className="mt-6 px-6 text-sm text-muted-foreground text-center">
          Your checkout was cancelled — nothing was charged. You can start again any time.
        </p>
      )}

      {data && ev && (
        <RsvpDialog
          open={open}
          onOpenChange={handleOpenChange}
          data={data}
          tenantSlug={ctx.slug}
          eventSlug={config.eventSlug}
          isPreview={ctx.isPreview}
          merchHeading={config.merchHeading}
          merchBlurb={config.merchBlurb}
        />
      )}
    </section>
  );
}

// ── The layer ──────────────────────────────────────────────────────────────

interface MerchSelection { quantity: number; size: string; color: string }

function RsvpDialog({
  open, onOpenChange, data, tenantSlug, eventSlug, isPreview, merchHeading, merchBlurb,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: RsvpData;
  tenantSlug: string;
  eventSlug: string;
  isPreview: boolean;
  merchHeading: string;
  merchBlurb: string;
}) {
  const tier = data.tiers[0];
  const [attending, setAttending] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [merch, setMerch] = useState<Record<string, MerchSelection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One updater so quantity/size/color never clobber each other. Defaults come
  // from the first option, matching what the buyer sees pre-selected.
  const updateMerch = (item: MerchItem, patch: Partial<MerchSelection>) =>
    setMerch((m) => {
      const current = m[item.id] ?? {
        quantity: 0,
        size: item.sizes[0] ?? '',
        color: item.colors[0]?.name ?? '',
      };
      return { ...m, [item.id]: { ...current, ...patch } };
    });

  const ticketCents = (tier?.price_cents ?? 0) * attending;
  const merchCents = useMemo(
    () => data.merch.reduce((sum, it) => sum + it.price_cents * (merch[it.id]?.quantity ?? 0), 0),
    [data.merch, merch],
  );
  const total = ticketCents + merchCents;

  // No tier configured is not a buyable state either — show the same closed
  // message rather than a form that can only fail at the server.
  const soldOut = !tier || tier.remaining <= 0;
  const maxSeats = Math.min(20, Math.max(1, tier?.remaining ?? 1));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isPreview) {
      setError('This is the editor preview — checkout is disabled here. Open the live site to test a real purchase.');
      return;
    }
    if (!name.trim()) return setError('Please tell us your name.');
    if (!email.includes('@')) return setError('Please enter a valid email — your tickets are sent there.');

    // A sized souvenir with no size chosen would be rejected by the server;
    // catch it here so the buyer isn't bounced after a round trip.
    for (const it of data.merch) {
      const sel = merch[it.id];
      if (!sel || sel.quantity < 1) continue;
      if (it.sizes.length > 0 && !sel.size) return setError(`Choose a size for the ${it.name}.`);
      if (it.colors.length > 0 && !sel.color) return setError(`Choose a color for the ${it.name}.`);
    }

    setSubmitting(true);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke('concert-rsvp-checkout', {
        body: {
          tenant_slug: tenantSlug,
          event_slug: eventSlug,
          tier_id: tier?.id,
          quantity: attending,
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          buyer_phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          merch: data.merch
            .filter((it) => (merch[it.id]?.quantity ?? 0) > 0)
            .map((it) => ({
              item_id: it.id,
              quantity: merch[it.id].quantity,
              size: merch[it.id].size || undefined,
              color: merch[it.id].color || undefined,
            })),
        },
      });
      if (fnError) throw new Error(fnError.message || 'Checkout failed');
      if (res?.error) throw new Error(res.error);
      if (!res?.url) throw new Error('No checkout URL received');
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong starting checkout.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl normal-case" style={{ fontFamily: 'var(--site-heading-font)' }}>
            {data.event.title}
          </DialogTitle>
          <DialogDescription>
            {formatDay(data.event.start_date)} · {formatTime(data.event.start_date)}
            {data.event.venue_name ? ` · ${data.event.venue_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        {soldOut ? (
          <div className="px-6 py-10 text-center">
            {tier ? (
              <>
                <p className="font-semibold">This event is sold out.</p>
                <p className="mt-1 text-sm text-muted-foreground">Thank you for the overwhelming response.</p>
              </>
            ) : (
              <>
                <p className="font-semibold">Tickets aren’t on sale yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Please check back soon.</p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-6">
            {/* Who's buying. Name, email, and phone lead the form: a visitor
                who abandons partway has still told us who they are, and the
                email is where the tickets go. The notes field deliberately
                stays at the bottom — it sits after the souvenir steppers,
                which tell the buyer to "say so in the notes below" for mixed
                sizes, and that instruction has to stay true. */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="rsvp-name">Your name</Label>
                <Input id="rsvp-name" value={name} onChange={(e) => setName(e.target.value)}
                       autoComplete="name" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="rsvp-email">Email</Label>
                <Input id="rsvp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       autoComplete="email" required className="mt-1" />
                <p className="mt-1 text-xs text-muted-foreground">Your tickets and receipt are sent here.</p>
              </div>
              <div>
                <Label htmlFor="rsvp-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="rsvp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                       autoComplete="tel" className="mt-1" />
              </div>
            </div>

            {/* Headcount */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base font-semibold">How many are coming?</Label>
                  <p className="text-sm text-muted-foreground">
                    {money(tier?.price_cents ?? 0)} per person
                    {tier && tier.remaining <= 25 ? ` · ${tier.remaining} seats left` : ''}
                  </p>
                </div>
                <Stepper value={attending} onChange={setAttending} min={1} max={maxSeats} label="guests" />
              </div>
            </div>

            {/* Souvenirs */}
            {data.merch.length > 0 && (
              <div className="border-t border-border pt-5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" style={{ color: 'var(--site-accent)' }} />
                  {merchHeading}
                </Label>
                {merchBlurb && <p className="text-sm text-muted-foreground mt-1">{merchBlurb}</p>}

                <div className="mt-4 space-y-4">
                  {data.merch.map((item) => {
                    const sel = merch[item.id];
                    const qty = sel?.quantity ?? 0;
                    return (
                      <div key={item.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{money(item.price_cents)}</p>
                          </div>
                          <Stepper
                            value={qty}
                            onChange={(n) => updateMerch(item, { quantity: n })}
                            label={item.name}
                          />
                        </div>

                        {qty > 0 && item.sizes.length > 0 && (
                          <div className="mt-3">
                            <Label htmlFor={`size-${item.id}`} className="text-xs text-muted-foreground">
                              Size
                            </Label>
                            <select
                              id={`size-${item.id}`}
                              value={sel?.size ?? ''}
                              onChange={(e) => updateMerch(item, { size: e.target.value })}
                              className="mt-1 w-full h-11 lg:h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              {item.sizes.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {qty > 0 && item.colors.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground">
                              Color{sel?.color ? <> — <span className="text-foreground">{sel.color}</span></> : ''}
                            </span>
                            <div role="radiogroup" aria-label={`${item.name} color`} className="mt-2 flex flex-wrap gap-2">
                              {item.colors.map((c) => {
                                const active = sel?.color === c.name;
                                return (
                                  <button
                                    key={c.name}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    aria-label={c.name}
                                    title={c.name}
                                    onClick={() => updateMerch(item, { color: c.name })}
                                    className={`w-11 h-11 lg:w-9 lg:h-9 rounded-full overflow-hidden border-2 transition-shadow ${
                                      active ? 'border-foreground shadow-md' : 'border-border hover:border-foreground/40'
                                    }`}
                                    style={c.swatch ? undefined : { background: c.hex ?? '#e5e5e5' }}
                                  >
                                    {c.swatch && (
                                      <img src={c.swatch} alt="" className="w-full h-full object-cover" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {qty > 1 && (item.sizes.length > 0 || item.colors.length > 0) && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            All {qty} the same. Need a mix? Say so in the notes below.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes. Stays last so the souvenir steppers' "say so in the
                notes below" points somewhere that is actually below them. */}
            <div className="border-t border-border pt-5">
              <Label htmlFor="rsvp-notes">Anything we should know? <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="rsvp-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                        rows={2} className="mt-1" placeholder="Accessibility needs, mixed shirt sizes, who you're coming with…" />
            </div>

            {/* Total */}
            <div className="border-t border-border pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {attending} × {tier?.name ?? 'Ticket'}
                </span>
                <span className="tabular-nums">{money(ticketCents)}</span>
              </div>
              {data.merch.map((it) => {
                const sel = merch[it.id];
                const qty = sel?.quantity ?? 0;
                if (qty === 0) return null;
                const variant = [sel?.size, sel?.color].filter(Boolean).join(', ');
                return (
                  <div key={it.id} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {qty} × {it.name}{variant ? ` (${variant})` : ''}
                    </span>
                    <span className="tabular-nums shrink-0">{money(it.price_cents * qty)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-border text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full font-semibold"
              style={{
                background: 'var(--site-accent)',
                color: 'var(--site-accent-foreground, #fff)',
                borderRadius: 'var(--site-radius)',
              }}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting secure checkout…</>
                : <>Continue to payment · {money(total)}</>}
            </Button>
            <p className="text-center text-xs text-muted-foreground -mt-2">
              Payments are processed securely by Stripe. Souvenirs are picked up at the concert.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Editor ─────────────────────────────────────────────────────────────────

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="rsvp-slug">Box Office event slug</Label>
        <Input id="rsvp-slug" value={config.eventSlug} onChange={(e) => set({ eventSlug: e.target.value })}
               placeholder="retirement-concert" className="mt-1" />
        <p className="mt-1 text-xs text-muted-foreground">
          Must match a <strong>published</strong> event's slug in Box Office. Prices, seats
          and souvenirs are pulled from that event.
        </p>
      </div>
      <div>
        <Label htmlFor="rsvp-heading">Heading</Label>
        <Input id="rsvp-heading" value={config.heading} onChange={(e) => set({ heading: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="rsvp-blurb">Intro text</Label>
        <Textarea id="rsvp-blurb" value={config.blurb} onChange={(e) => set({ blurb: e.target.value })} rows={3} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="rsvp-btn">Button label</Label>
        <Input id="rsvp-btn" value={config.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} className="mt-1" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={config.showCard} onChange={(e) => set({ showCard: e.target.checked })} />
        Show the event card on the page
      </label>
      <p className="text-xs text-muted-foreground">
        Any link or button on this page pointing to <code className="px-1 rounded bg-muted">#rsvp</code> opens
        this form — so a hero CTA can open it even with the card hidden.
      </p>
      <div>
        <Label htmlFor="rsvp-merch-heading">Souvenir section heading</Label>
        <Input id="rsvp-merch-heading" value={config.merchHeading} onChange={(e) => set({ merchHeading: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="rsvp-merch-blurb">Souvenir section note</Label>
        <Textarea id="rsvp-merch-blurb" value={config.merchBlurb} onChange={(e) => set({ merchBlurb: e.target.value })} rows={2} className="mt-1" />
      </div>
    </div>
  );
}

export const concertRsvpBlock: BlockModule<typeof schema> = {
  type: 'concert-rsvp',
  name: 'Concert RSVP',
  description: 'Event details with a pop-up form for headcount, tickets and souvenirs. Paid through Stripe.',
  icon: Ticket,
  tier: 'free',
  group: 'core',
  poweredBy: 'Box Office',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
