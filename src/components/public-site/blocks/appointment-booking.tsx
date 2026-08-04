// Appointment Booking — public-site block.
//
// Design: two-column desktop split. Left column is the editorial pitch —
// eyebrow, serif headline, intro paragraph, and a prominent "Book now"
// CTA card that visually anchors the section. Right column is the
// services list, rendered as separated tile-cards with a colored icon
// pill, service title, duration/price meta row, and a description.
// Collapses to a single stacked column below the sm breakpoint.
//
// Ships with three example services so a tenant who drops it in sees a
// polished, working section immediately — not a blank rail.

import { z } from 'zod';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarClock, Plus, Trash2, GripVertical, ArrowRight, Sparkles, Music2, Mic2, Piano, Loader2, Import } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  eyebrow: z.string().default('One-on-one'),
  heading: z.string().default('Book an appointment'),
  intro: z.string().default(
    'Private sessions, tailored to where you are. Choose a service below, then pick a time that works.',
  ),
  bookingUrl: z.string().default(''),
  ctaLabel: z.string().default('Book now'),
  ctaFootnote: z.string().default('Response within 24 hours'),
  services: z
    .array(
      z.object({
        name: z.string().default(''),
        duration: z.string().default(''),
        price: z.string().default(''),
        description: z.string().default(''),
        // Optional per-service booking link. If set, the card itself
        // becomes the click target and gets a right-arrow affordance.
        // If left blank, the card falls back to the section CTA.
        bookingUrl: z.string().default(''),
      }),
    )
    .default([]),
});
type Config = z.infer<typeof schema>;

// Deterministic icon per service based on the row index — cycles through
// four musically-appropriate lucide glyphs so the tile column reads as
// styled, not clip-arty. The icon is decorative; screen readers get the
// service name as the header.
const SERVICE_ICONS = [Music2, Mic2, Piano, Sparkles] as const;

function Render({ config }: BlockRenderProps<Config>) {
  const services = config.services.filter((s) => s.name);
  // Fall back to the in-app Studio Hours flow when the tenant hasn't
  // filled in a booking link. Blocks saved before /book-appointment
  // became the default were rendering NO button; the CTA card + card
  // arrows all key off this value now, so it's always safe to click.
  const effectiveBookingUrl = config.bookingUrl?.trim() || '/book-appointment';
  const noContent = !config.heading && services.length === 0;
  if (noContent) return null;

  return (
    <section id="appointments" className="max-w-6xl mx-auto w-full">
      <div className="px-4 cq-sm:px-6 py-10 cq-sm:py-14">
        <div className="grid gap-8 cq-lg:gap-12 cq-lg:grid-cols-[5fr_7fr]">
          {/* Left column — editorial pitch + CTA card */}
          <div className="flex flex-col">
            {config.eyebrow && (
              <div
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-semibold mb-4 self-start"
                style={{ color: 'var(--site-accent)' }}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                {config.eyebrow}
              </div>
            )}
            {config.heading && (
              <h2
                className="normal-case text-3xl cq-sm:text-4xl cq-lg:text-5xl font-bold leading-[1.05] tracking-tight mb-4"
                style={{ fontFamily: 'var(--site-heading-font, "Playfair Display", Georgia, serif)' }}
              >
                {config.heading}
              </h2>
            )}
            {config.intro && (
              <p className="text-base cq-sm:text-lg text-muted-foreground leading-relaxed mb-6 max-w-xl">
                {config.intro}
              </p>
            )}
            <div
              className="mt-auto rounded-2xl p-5 cq-sm:p-6 shadow-lg border"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklab, var(--site-accent) 96%, black 4%) 0%, var(--site-accent) 100%)',
                borderColor: 'color-mix(in oklab, var(--site-accent) 40%, black 60%)',
                color: 'white',
              }}
            >
              <div className="text-xs uppercase tracking-widest opacity-80 mb-2">
                Ready when you are
              </div>
              <div className="text-xl cq-sm:text-2xl font-semibold mb-4">
                Grab a slot on the calendar
              </div>
              <a
                href={effectiveBookingUrl}
                target={effectiveBookingUrl.startsWith('http') ? '_blank' : undefined}
                rel={effectiveBookingUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-shadow"
                style={{ color: 'var(--site-accent)' }}
              >
                {config.ctaLabel || 'Book now'} <ArrowRight className="w-4 h-4" />
              </a>
              {config.ctaFootnote && (
                <p className="text-xs mt-3 opacity-85">{config.ctaFootnote}</p>
              )}
            </div>
          </div>

          {/* Right column — services grid */}
          {services.length > 0 && (
            <div className="space-y-4">
              {services.map((s, i) => {
                const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                // Cascade: service-specific URL → block-level URL → the
                // in-app Studio Hours fallback. Cards are ALWAYS clickable
                // even when the tenant didn't fill in a booking link.
                const cardUrl = s.bookingUrl?.trim() || effectiveBookingUrl;
                const cardIsLink = !!cardUrl;
                const Wrapper = cardIsLink ? 'a' : 'div';
                const wrapperProps: Record<string, unknown> = cardIsLink
                  ? {
                      href: cardUrl,
                      target: cardUrl.startsWith('http') ? '_blank' : undefined,
                      rel: cardUrl.startsWith('http') ? 'noopener noreferrer' : undefined,
                    }
                  : {};
                return (
                  <Wrapper
                    key={i}
                    {...wrapperProps}
                    className={`group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all ${
                      cardIsLink ? 'cursor-pointer hover:shadow-xl hover:-translate-y-0.5' : ''
                    }`}
                  >
                    {/* Left accent stripe — thicker on hover to signal
                        interactivity. Absolute so it hugs the card edge
                        under the rounded corners. */}
                    <span
                      className={`absolute inset-y-0 left-0 w-1 ${
                        cardIsLink ? 'group-hover:w-1.5' : ''
                      } transition-[width]`}
                      style={{ background: 'var(--site-accent)' }}
                      aria-hidden
                    />
                    <div className="pl-5 pr-4 cq-sm:pr-5 py-5 flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl inline-flex items-center justify-center shrink-0 shadow-sm"
                        style={{
                          background:
                            'linear-gradient(135deg, color-mix(in oklab, var(--site-accent) 16%, transparent) 0%, color-mix(in oklab, var(--site-accent) 8%, transparent) 100%)',
                          color: 'var(--site-accent)',
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-0.5 mb-1">
                          <span className="font-semibold text-lg leading-tight normal-case text-foreground">
                            {s.name}
                          </span>
                          {s.duration && (
                            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
                              {s.duration}
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0 pl-2">
                        {s.price && (
                          <span
                            className="text-base font-bold tabular-nums"
                            style={{ color: 'var(--site-accent)' }}
                          >
                            {s.price}
                          </span>
                        )}
                        {cardIsLink && (
                          <span
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5"
                            style={{
                              background: 'color-mix(in oklab, var(--site-accent) 10%, transparent)',
                              color: 'var(--site-accent)',
                            }}
                            aria-hidden
                          >
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Format duration_minutes → "30 min" / "1 hour" / "1 h 30 min" for the
// block's display field.
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h} h ${m} min`;
}

// Studio Hours (gw_services) row shape — only the fields we use here.
interface StudioHoursService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price_display: string | null;
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['services'][number]>) =>
    set({ services: config.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const remove = (i: number) => set({ services: config.services.filter((_, j) => j !== i) });
  const add = () =>
    set({ services: [...config.services, { name: '', duration: '', price: '', description: '', bookingUrl: '' }] });

  // Studio Hours importer — pulls the tenant's active gw_services rows
  // and lets the tenant tick the ones they want to expose publicly.
  // Selected rows are APPENDED to the current services array (so the
  // tenant can also hand-edit or add extras). The picker only opens
  // when clicked so we don't fetch on every editor mount.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: studioServices, isLoading, error, refetch } = useQuery<StudioHoursService[]>({
    queryKey: ['appointment-block-studio-services'],
    enabled: pickerOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_services')
        .select('id, name, description, duration_minutes, price_display')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as StudioHoursService[];
    },
  });

  const importSelected = () => {
    if (!studioServices || selectedIds.size === 0) return;
    const rows = studioServices
      .filter((s) => selectedIds.has(s.id))
      .map((s) => ({
        name: s.name,
        duration: formatDuration(s.duration_minutes),
        price: s.price_display ?? '',
        description: s.description ?? '',
        bookingUrl: '',
      }));
    set({ services: [...config.services, ...rows] });
    setSelectedIds(new Set());
    setPickerOpen(false);
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
        <div className="space-y-1.5">
          <Label>Eyebrow</Label>
          <Input value={config.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} placeholder="One-on-one" />
        </div>
        <div className="space-y-1.5">
          <Label>Section heading</Label>
          <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Intro paragraph</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1.5 sm:col-span-1">
          <Label>Booking link</Label>
          <Input
            value={config.bookingUrl}
            onChange={(e) => set({ bookingUrl: e.target.value })}
            placeholder="/book-appointment"
          />
          <p className="text-[10px] text-slate-500 leading-snug">
            <code className="bg-slate-100 px-1 rounded">/book-appointment</code> uses the
            built-in Studio Hours flow. Or paste a Calendly / Cal.com URL.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>CTA label</Label>
          <Input
            value={config.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            placeholder="Book now"
          />
        </div>
        <div className="space-y-1.5">
          <Label>CTA footnote</Label>
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
          <p className="text-xs text-slate-500">
            List the kinds of appointments visitors can book (lessons, auditions, consultations…).
          </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <Input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Private voice lesson"
                className="h-8 text-sm"
              />
              <Input
                value={s.duration}
                onChange={(e) => update(i, { duration: e.target.value })}
                placeholder="30 min"
                className="h-8 text-sm w-full sm:w-24"
              />
              <Input
                value={s.price}
                onChange={(e) => update(i, { price: e.target.value })}
                placeholder="$60"
                className="h-8 text-sm w-full sm:w-20"
              />
            </div>
            <Textarea
              value={s.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="What's included (optional)"
              rows={2}
              className="text-sm"
            />
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-slate-500">
                Booking link for this service (optional)
              </Label>
              <Input
                value={s.bookingUrl}
                onChange={(e) => update(i, { bookingUrl: e.target.value })}
                placeholder="https://calendly.com/you/private-lesson"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-slate-500">
                Overrides the section CTA. Leave blank to use the main link (defaults to
                Studio Hours at <code className="bg-slate-100 px-1 rounded">/book-appointment</code>).
              </p>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add service
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedIds(new Set()); setPickerOpen(true); }}
            className="gap-1.5"
            title="Pick services you've already set up in Studio Hours and drop them in here"
          >
            <Import className="w-4 h-4" /> Load from Studio Hours
          </Button>
        </div>

        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Import from Studio Hours</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-80 overflow-y-auto -mx-2 px-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading services…
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 py-4">
                  Couldn't load: {error instanceof Error ? error.message : String(error)}
                  <Button variant="link" size="sm" onClick={() => refetch()}>Retry</Button>
                </div>
              )}
              {!isLoading && !error && (studioServices?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No active services in Studio Hours yet.{' '}
                  <a href="/dashboard/office-hours" className="underline font-medium">
                    Set some up
                  </a>{' '}
                  first.
                </p>
              )}
              {studioServices?.map((s) => {
                const checked = selectedIds.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleId(s.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline flex-wrap gap-x-3">
                        <span className="font-semibold text-sm">{s.name}</span>
                        {s.duration_minutes && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(s.duration_minutes)}
                          </span>
                        )}
                        {s.price_display && (
                          <span className="ml-auto text-sm font-bold text-primary">
                            {s.price_display}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
              <Button
                onClick={importSelected}
                disabled={selectedIds.size === 0}
              >
                Add {selectedIds.size || ''} to block
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export const appointmentBookingBlock: BlockModule<typeof schema> = {
  type: 'appointment-booking',
  name: 'Appointment Booking',
  description: 'Let visitors book lessons, auditions, or consultations through your scheduling link.',
  icon: CalendarClock,
  // Was gated on the retired 'appointments' add-on which never landed in
  // gw_billing_modules — the block was permanently un-activatable. Tiers
  // model now covers gating; treat this block as free-for-all.
  tier: 'free',
  group: 'core',
  poweredBy: 'Appointments',
  configSchema: schema,
  // Rich default config so a tenant who drops the block in sees a polished
  // section instantly. Placeholder services + intro are safe/generic and
  // will be swapped by the tenant during the editing pass.
  defaultConfig: {
    eyebrow: 'One-on-one',
    heading: 'Book an appointment',
    intro:
      'Private sessions, tailored to where you are. Choose a service below, then pick a time that works.',
    // Default to the built-in Studio Hours flow. Tenants can override
    // per-service or globally to point at Calendly / Cal.com / external.
    bookingUrl: '/book-appointment',
    ctaLabel: 'Book now',
    ctaFootnote: 'Response within 24 hours',
    services: [
      {
        name: 'Private voice lesson',
        duration: '30 min',
        price: '$60',
        description: 'One-on-one work on tone, range, and repertoire. Beginners welcome.',
        bookingUrl: '',
      },
      {
        name: 'Music theory tutoring',
        duration: '45 min',
        price: '$70',
        description: 'Sight-singing, harmony, and ear training — sized to what you are working on.',
        bookingUrl: '',
      },
      {
        name: 'Recording / producer session',
        duration: '1 hour',
        price: '$150',
        description: 'Track a demo, an audition tape, or a full song in a treated room.',
        bookingUrl: '',
      },
    ],
  },
  EditorForm,
  Render,
};
