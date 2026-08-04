// Appointment booking — the visitor picks a service, a day and a time, leaves
// their details, and is done, all without leaving the public page.
//
// This block used to be a button pointing at a `bookingUrl`, which in practice
// meant `/appointments` — a route behind auth. A prospective student who has
// never signed in would land on a login wall instead of a booking form, which
// is exactly the wrong moment to ask someone to make an account. So the flow
// now completes here and the visitor never authenticates at all.
//
// The schedule lives in this block's own config (services + weekly windows)
// rather than in gw_appointment_services / gw_appointment_availability, which
// no tenant has ever populated. The server reads that config back out of the
// PUBLISHED site snapshot, so the times offered here and the times the server
// will accept are derived from the same source — the client sends only a
// service index and a start instant, and gw_booking_public_submit recomputes
// the rest. See supabase/migrations/20260804210000_public_site_booking.sql.
//
// `bookingUrl` survives for tenants who really do run an external scheduler
// (Calendly and friends), but only absolute http(s) URLs are honored — an
// in-app path there is the bug this block was rewritten to fix.

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CalendarClock, Plus, Trash2, GripVertical, ArrowRight, Loader2, Check, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const windowSchema = z.object({
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay and Postgres `dow`. */
  day: z.number().int().min(0).max(6),
  start: z.string().default('09:00'),
  end: z.string().default('17:00'),
});

// Before this block could schedule anything, duration was free text shown next
// to the service name, and tenants wrote it however they liked — "30 min",
// "45 min", "1 hour". Read a real number out of it when the structured field is
// missing, or a service advertised as an hour quietly starts booking 30-minute
// slots. Naive digit-stripping is not enough: "1 hour" is 60, not 1.
// _gw_booking_duration in the migration parses identically — the two must agree
// or a visitor is offered times the server then refuses.
export function parseDurationMinutes(raw: string): number | null {
  const s = (raw || '').toLowerCase();
  const hours = s.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hr|hour)/);
  const mins = s.match(/(\d+)\s*(?:m\b|min|minute)/);
  let total = 0;
  if (hours) total += parseFloat(hours[1]) * 60;
  if (mins) total += parseInt(mins[1], 10);
  if (!hours && !mins) {
    const bare = s.match(/\d+/);
    if (bare) total = parseInt(bare[0], 10);
  }
  total = Math.round(total);
  return total >= 5 && total <= 480 ? total : null;
}

const serviceSchema = z.preprocess((raw) => {
  const s = (raw ?? {}) as Record<string, unknown>;
  if (s.durationMinutes == null && typeof s.duration === 'string') {
    const n = parseDurationMinutes(s.duration);
    if (n !== null) return { ...s, durationMinutes: n };
  }
  return s;
}, z.object({
  name: z.string().default(''),
  /** Display string, e.g. "30 min". Free text; kept for back-compat. */
  duration: z.string().default(''),
  /** The number the scheduler actually uses. */
  durationMinutes: z.number().int().min(5).max(480).default(30),
  /** Display only — this block does not take payment. */
  price: z.string().default(''),
  description: z.string().default(''),
}));

const schema = z.object({
  /** Kicker above the heading. Already authored on live sites. */
  eyebrow: z.string().default(''),
  heading: z.string().default('Book an appointment'),
  intro: z.string().default(''),
  ctaLabel: z.string().default('Book now'),
  /** Small print under the submit button, e.g. "Response within 24 hours". */
  ctaFootnote: z.string().default(''),
  confirmationMessage: z.string().default(''),
  /** Absolute http(s) URL of an external scheduler. Replaces the inline flow. */
  bookingUrl: z.string().default(''),
  timezone: z.string().default('America/New_York'),
  /** How far ahead visitors may book, and how much notice you need. */
  horizonDays: z.number().int().min(1).max(365).default(30),
  leadHours: z.number().int().min(0).max(720).default(12),
  /** Spacing of start times within a window. */
  slotMinutes: z.number().int().min(5).max(480).default(30),
  collectPhone: z.boolean().default(true),
  availability: z.array(windowSchema).default([
    { day: 1, start: '09:00', end: '17:00' },
    { day: 2, start: '09:00', end: '17:00' },
    { day: 3, start: '09:00', end: '17:00' },
    { day: 4, start: '09:00', end: '17:00' },
    { day: 5, start: '09:00', end: '17:00' },
  ]),
  services: z.array(serviceSchema).default([]),
});
type Config = z.infer<typeof schema>;

interface ServiceOption {
  idx: number;
  name: string;
  description: string | null;
  duration: string | null;
  durationMinutes: number;
  price: string | null;
}
interface BookingOptions {
  available: boolean;
  timezone: string;
  horizonDays: number;
  leadHours: number;
  collectPhone: boolean;
  weekdays: number[];
  services: ServiceOption[];
}
interface BookingReceipt {
  ok: boolean;
  id: string;
  startsAt: string;
  durationMinutes: number;
  service: string;
  timezone: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Only absolute http(s) URLs count — an in-app path would be a login wall. */
export function externalUrl(raw: string): string | null {
  const url = (raw || '').trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

/** "YYYY-MM-DD" for an instant, as seen in the given zone. */
function isoDateIn(tz: string, at: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  }
}

/** Calendar-date helpers that never touch the local zone. */
function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function labelDate(isoDate: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: DAY_SHORT[dt.getUTCDay()],
    day: String(dt.getUTCDate()),
    month: dt.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
  };
}
// Always name the zone: a visitor reading this in California must not mistake
// a 3:00 PM Atlanta lesson for 3:00 PM their time.
function formatSlot(iso: string, tz: string): string {
  const dt = new Date(iso);
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz, hour: 'numeric', minute: '2-digit',
    }).format(dt);
  } catch {
    return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
}
function formatFullSlot(iso: string, tz: string): string {
  const dt = new Date(iso);
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(dt);
  } catch {
    return dt.toLocaleString();
  }
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-6 h-6 rounded-full grid place-items-center text-xs font-semibold shrink-0"
          style={{ background: 'var(--site-accent)', color: 'var(--site-accent-foreground)' }}
        >
          {n}
        </span>
        <h3 className="normal-case text-sm font-semibold tracking-wide uppercase text-muted-foreground">{label}</h3>
      </div>
      {children}
    </div>
  );
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const external = externalUrl(config.bookingUrl);

  const [serviceIdx, setServiceIdx] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  const { data: options, isLoading } = useQuery({
    queryKey: ['booking-options', ctx.slug],
    enabled: !external && Boolean(ctx.slug),
    staleTime: 60_000,
    queryFn: async (): Promise<BookingOptions | null> => {
      const { data, error } = await supabase.rpc('gw_booking_public_options', { p_slug: ctx.slug });
      if (error) throw new Error(error.message);
      return data as unknown as BookingOptions | null;
    },
  });

  const tz = options?.timezone || config.timezone;
  const services = useMemo(() => options?.services ?? [], [options]);
  const live = Boolean(options?.available) && services.length > 0;

  // One service on offer is not a choice — pick it and show the calendar.
  useEffect(() => {
    if (live && serviceIdx === null && services.length === 1) setServiceIdx(services[0].idx);
  }, [live, serviceIdx, services]);

  const { data: slotData, isFetching: loadingSlots } = useQuery({
    queryKey: ['booking-slots', ctx.slug, serviceIdx, date],
    enabled: live && serviceIdx !== null && Boolean(date),
    staleTime: 15_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('gw_booking_public_slots', {
        p_slug: ctx.slug, p_service_idx: serviceIdx, p_date: date,
      });
      if (error) throw new Error(error.message);
      return ((data as { slots?: string[] } | null)?.slots ?? []);
    },
  });
  const slots = slotData ?? [];

  const selectedService = services.find((s) => s.idx === serviceIdx) ?? null;

  // Candidate days: the horizon, filtered to weekdays the owner opened. Whether
  // a given day still has room is the server's call — that comes back with the
  // slot list once the visitor taps a day.
  const days = useMemo(() => {
    if (!options) return [];
    const open = new Set(options.weekdays ?? []);
    const start = isoDateIn(tz, new Date());
    const out: string[] = [];
    for (let i = 0; i <= options.horizonDays; i++) {
      const d = addDays(start, i);
      if (open.has(dayOfWeek(d))) out.push(d);
    }
    return out;
  }, [options, tz]);

  const submit = useMutation({
    mutationFn: async (): Promise<BookingReceipt> => {
      const { data, error } = await supabase.rpc('gw_booking_public_submit', {
        p_slug: ctx.slug,
        p_service_idx: serviceIdx,
        p_service_name: selectedService?.name ?? '',
        p_start: slot,
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone || null,
        p_notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      return data as unknown as BookingReceipt;
    },
    onSuccess: (data) => { setReceipt(data); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const nothingToShow =
    !config.heading && config.services.length === 0 && !external && !live;
  if (nothingToShow && !isLoading) return null;

  const heading = (config.eyebrow || config.heading) && (
    <>
      {config.eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--site-accent)' }}>
          {config.eyebrow}
        </p>
      )}
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <CalendarClock className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
    </>
  );
  const intro = config.intro && (
    <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>
  );

  // External scheduler: the tenant has opted out of the inline flow.
  if (external) {
    return (
      <section id="appointments" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {heading}
        {intro}
        <div className="text-center">
          <a
            href={external}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium"
            style={{ background: 'var(--site-accent)', color: 'var(--site-accent-foreground)' }}
          >
            {config.ctaLabel || 'Book now'} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    );
  }

  // Booked. Everything the visitor needs is on this page — no confirmation
  // email to wait on, no account to check.
  if (receipt) {
    return (
      <section id="appointments" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {heading}
        <div
          className="border border-border bg-card p-6 sm:p-8 max-w-2xl"
          style={{ borderRadius: 'var(--site-radius)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="w-10 h-10 rounded-full grid place-items-center shrink-0"
              style={{ background: 'var(--site-accent)', color: 'var(--site-accent-foreground)' }}
            >
              <Check className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-lg normal-case">You're booked</p>
              <p className="text-sm text-muted-foreground">Request sent to {ctx.orgName}</p>
            </div>
          </div>
          <dl className="grid gap-2 text-sm border-t border-border pt-4">
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Service</dt>
              <dd className="font-medium">{receipt.service}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">When</dt>
              <dd className="font-medium">{formatFullSlot(receipt.startsAt, receipt.timezone)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Length</dt>
              <dd className="font-medium">{receipt.durationMinutes} min</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Confirmation</dt>
              <dd className="font-mono text-xs">{receipt.id.slice(0, 8).toUpperCase()}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground mt-4">
            {config.confirmationMessage
              || `We'll confirm by email at ${form.email}. Save your confirmation code in case you need to reach us.`}
          </p>
        </div>
      </section>
    );
  }

  // Not live: unpublished site, no services configured, or the addon is off.
  // In the editor say why; on a public page fall back to reading the services
  // as a plain list rather than showing a visitor a broken form.
  if (!isLoading && !live) {
    const listed = config.services.filter((s) => s.name);
    return (
      <section id="appointments" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {heading}
        {intro}
        {listed.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {listed.map((s, i) => (
              <li key={i} className="flex items-baseline gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold normal-case">{s.name}</span>
                    {s.duration && <span className="text-xs text-muted-foreground">{s.duration}</span>}
                    {s.price && (
                      <span className="text-sm font-medium ml-auto" style={{ color: 'var(--site-accent)' }}>
                        {s.price}
                      </span>
                    )}
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {ctx.isPreview && (
          <p className="mt-4 text-sm text-muted-foreground">
            {listed.length === 0
              ? 'Add at least one service below, then publish the site — visitors will be able to book right here.'
              : 'Publish the site to start taking bookings on this page.'}
          </p>
        )}
      </section>
    );
  }

  const visibleDays = showAllDays ? days : days.slice(0, 12);
  const canSubmit = Boolean(slot && form.name.trim() && form.email.trim()) && !submit.isPending;

  return (
    <section id="appointments" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
      {heading}
      {intro}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading availability…
        </div>
      ) : (
        <div className="max-w-2xl">
          <Step n={1} label="Choose a service">
            <ul className="grid gap-2">
              {services.map((s) => {
                const active = s.idx === serviceIdx;
                return (
                  <li key={s.idx}>
                    <button
                      type="button"
                      onClick={() => { setServiceIdx(s.idx); setDate(null); setSlot(null); setError(null); }}
                      aria-pressed={active}
                      className="w-full text-left p-4 border bg-card transition-colors hover:border-foreground/30"
                      style={{
                        borderRadius: 'var(--site-radius)',
                        borderColor: active ? 'var(--site-accent)' : undefined,
                        boxShadow: active ? '0 0 0 1px var(--site-accent)' : undefined,
                      }}
                    >
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold normal-case">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.duration || `${s.durationMinutes} min`}
                        </span>
                        {s.price && (
                          <span className="text-sm font-medium ml-auto" style={{ color: 'var(--site-accent)' }}>
                            {s.price}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Step>

          {serviceIdx !== null && (
            <Step n={2} label="Pick a day">
              {days.length === 0 ? (
                <p className="text-sm text-muted-foreground">No days are open for booking right now.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {visibleDays.map((d) => {
                      const active = d === date;
                      const l = labelDate(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => { setDate(d); setSlot(null); setError(null); }}
                          aria-pressed={active}
                          className="w-16 py-2 border bg-card text-center transition-colors hover:border-foreground/30"
                          style={{
                            borderRadius: 'var(--site-radius)',
                            borderColor: active ? 'var(--site-accent)' : undefined,
                            boxShadow: active ? '0 0 0 1px var(--site-accent)' : undefined,
                          }}
                        >
                          <span className="block text-[11px] text-muted-foreground">{l.weekday}</span>
                          <span className="block text-lg font-semibold leading-tight tabular-nums">{l.day}</span>
                          <span className="block text-[11px] text-muted-foreground">{l.month}</span>
                        </button>
                      );
                    })}
                  </div>
                  {days.length > visibleDays.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllDays(true)}
                      className="mt-3 text-sm underline text-muted-foreground hover:text-foreground"
                    >
                      Show more dates
                    </button>
                  )}
                </>
              )}
            </Step>
          )}

          {date && (
            <Step n={3} label="Pick a time">
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking open times…
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing open on {DAY_NAMES[dayOfWeek(date)]}. Try another day.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const active = s === slot;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSlot(s); setError(null); }}
                        aria-pressed={active}
                        className="px-4 py-2 border bg-card text-sm font-medium tabular-nums transition-colors hover:border-foreground/30"
                        style={{
                          borderRadius: 'var(--site-radius)',
                          borderColor: active ? 'var(--site-accent)' : undefined,
                          boxShadow: active ? '0 0 0 1px var(--site-accent)' : undefined,
                        }}
                      >
                        {formatSlot(s, tz)}
                      </button>
                    );
                  })}
                </div>
              )}
            </Step>
          )}

          {slot && (
            <Step n={4} label="Your details">
              <div
                className="border border-border bg-card p-4 sm:p-6"
                style={{ borderRadius: 'var(--site-radius)' }}
              >
                <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-border">
                  <div>
                    <p className="font-semibold normal-case">{selectedService?.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFullSlot(slot, tz)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlot(null)}
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Change
                  </button>
                </div>

                <form
                  className="grid gap-3"
                  onSubmit={(e) => { e.preventDefault(); if (canSubmit) submit.mutate(); }}
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="bk-name">Name</Label>
                    <Input
                      id="bk-name"
                      value={form.name}
                      autoComplete="name"
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bk-email">Email</Label>
                    <Input
                      id="bk-email"
                      type="email"
                      value={form.email}
                      autoComplete="email"
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  {options?.collectPhone && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="bk-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input
                        id="bk-phone"
                        type="tel"
                        value={form.phone}
                        autoComplete="tel"
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="grid gap-1.5">
                    <Label htmlFor="bk-notes">Anything we should know? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      id="bk-notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full rounded-full h-11 mt-1"
                    style={{ background: 'var(--site-accent)', color: 'var(--site-accent-foreground)' }}
                  >
                    {submit.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</>
                      : (config.ctaLabel || 'Book now')}
                  </Button>
                  {config.ctaFootnote && (
                    <p className="text-xs text-muted-foreground text-center">{config.ctaFootnote}</p>
                  )}
                </form>
              </div>
            </Step>
          )}
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['services'][number]>) =>
    set({ services: config.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const remove = (i: number) => set({ services: config.services.filter((_, j) => j !== i) });
  const add = () =>
    set({ services: [...config.services, { name: '', duration: '', durationMinutes: 30, price: '', description: '' }] });

  const windowFor = (day: number) => config.availability.find((w) => w.day === day);
  const toggleDay = (day: number, on: boolean) =>
    set({
      availability: on
        ? [...config.availability, { day, start: '09:00', end: '17:00' }].sort((a, b) => a.day - b.day)
        : config.availability.filter((w) => w.day !== day),
    });
  const setWindow = (day: number, patch: Partial<z.infer<typeof windowSchema>>) =>
    set({ availability: config.availability.map((w) => (w.day === day ? { ...w, ...patch } : w)) });

  const usingExternal = Boolean(externalUrl(config.bookingUrl));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Eyebrow (optional)</Label>
        <Input
          value={config.eyebrow}
          onChange={(e) => set({ eyebrow: e.target.value })}
          placeholder="One-on-one"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro (optional)</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Button label</Label>
          <Input
            value={config.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            placeholder="Book now"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Small print (optional)</Label>
          <Input
            value={config.ctaFootnote}
            onChange={(e) => set({ ctaFootnote: e.target.value })}
            placeholder="Response within 24 hours"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Services offered</Label>
        {config.services.length === 0 && (
          <p className="text-xs text-slate-500">List the kinds of appointments visitors can book (lessons, auditions, consultations…).</p>
        )}
        {config.services.map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Service {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Private voice lesson"
                className="h-8 text-sm"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={s.durationMinutes}
                  onChange={(e) => update(i, { durationMinutes: Number(e.target.value) || 30 })}
                  className="h-8 text-sm w-20"
                />
                <span className="text-xs text-slate-500">min</span>
                <Input
                  value={s.price}
                  onChange={(e) => update(i, { price: e.target.value })}
                  placeholder="$60"
                  className="h-8 text-sm w-20"
                />
              </div>
            </div>
            <Textarea
              value={s.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="What's included (optional)"
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add service
        </Button>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-4">
        <Label>Weekly availability</Label>
        <p className="text-xs text-slate-500">
          Visitors can only pick start times inside these windows, and only when nothing else is booked.
        </p>
        {DAY_NAMES.map((name, day) => {
          const w = windowFor(day);
          return (
            <div key={day} className="flex items-center gap-2">
              <Switch checked={Boolean(w)} onCheckedChange={(on) => toggleDay(day, on)} />
              <span className="text-sm w-24 shrink-0">{name}</span>
              {w ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={w.start}
                    onChange={(e) => setWindow(day, { start: e.target.value })}
                    className="h-8 text-sm w-28"
                  />
                  <span className="text-xs text-slate-500">to</span>
                  <Input
                    type="time"
                    value={w.end}
                    onChange={(e) => setWindow(day, { end: e.target.value })}
                    className="h-8 text-sm w-28"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-400">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Start times every</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={5}
              max={480}
              step={5}
              value={config.slotMinutes}
              onChange={(e) => set({ slotMinutes: Number(e.target.value) || 30 })}
              className="h-8 text-sm"
            />
            <span className="text-xs text-slate-500">min</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notice needed</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={720}
              value={config.leadHours}
              onChange={(e) => set({ leadHours: Number(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
            <span className="text-xs text-slate-500">hrs</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Book up to</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={365}
              value={config.horizonDays}
              onChange={(e) => set({ horizonDays: Number(e.target.value) || 30 })}
              className="h-8 text-sm"
            />
            <span className="text-xs text-slate-500">days</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Time zone</Label>
        <Input
          value={config.timezone}
          onChange={(e) => set({ timezone: e.target.value })}
          placeholder="America/New_York"
          className="h-8 text-sm"
        />
        <p className="text-xs text-slate-500">
          Your windows are in this zone. Visitors elsewhere see the time converted, with the zone named.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={config.collectPhone} onCheckedChange={(on) => set({ collectPhone: on })} />
        <span className="text-sm">Ask for a phone number</span>
      </div>

      <div className="space-y-1.5">
        <Label>Confirmation message (optional)</Label>
        <Textarea
          value={config.confirmationMessage}
          onChange={(e) => set({ confirmationMessage: e.target.value })}
          rows={2}
          placeholder="What happens next — when you'll confirm, where to park, what to bring."
        />
      </div>

      <div className="space-y-1.5 border-t border-slate-200 pt-4">
        <Label>External scheduler (optional)</Label>
        <Input
          value={config.bookingUrl}
          onChange={(e) => set({ bookingUrl: e.target.value })}
          placeholder="https://calendly.com/…"
        />
        <p className="text-xs text-slate-500">
          {usingExternal
            ? 'Visitors are sent to this scheduler instead of booking on your page. Clear it to use the built-in form.'
            : 'Leave blank to take bookings directly on your page. Only full https:// links are used.'}
        </p>
      </div>
    </div>
  );
}

export const appointmentBookingBlock: BlockModule<typeof schema> = {
  type: 'appointment-booking',
  name: 'Appointment Booking',
  description: 'Let visitors book lessons, auditions, or consultations right on your page — no account needed.',
  icon: CalendarClock,
  tier: 'addon',
  requiredAddon: 'appointments',
  group: 'addon',
  poweredBy: 'Appointments',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
