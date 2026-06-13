import { z } from 'zod';
import { CalendarClock, Plus, Trash2, GripVertical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Book an appointment'),
  intro: z.string().default(''),
  bookingUrl: z.string().default(''),
  ctaLabel: z.string().default('Book now'),
  services: z.array(z.object({
    name: z.string().default(''),
    duration: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  if (!config.heading && config.services.length === 0 && !config.bookingUrl) return null;
  const services = config.services.filter((s) => s.name);
  return (
    <section id="appointments" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <CalendarClock className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      {services.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card mb-6">
          {services.map((s, i) => (
            <li key={i} className="flex items-baseline gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold normal-case">{s.name}</span>
                  {s.duration && (
                    <span className="text-xs text-muted-foreground">{s.duration}</span>
                  )}
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {config.bookingUrl && (
        <div className="text-center">
          <a
            href={config.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-white font-medium"
            style={{ background: 'var(--site-accent)' }}
          >
            {config.ctaLabel || 'Book now'} <ArrowRight className="w-4 h-4" />
          </a>
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
    set({ services: [...config.services, { name: '', duration: '', description: '' }] });

  return (
    <div className="space-y-4">
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
          <Label>Booking link</Label>
          <Input
            value={config.bookingUrl}
            onChange={(e) => set({ bookingUrl: e.target.value })}
            placeholder="/appointments or https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Button label</Label>
          <Input
            value={config.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            placeholder="Book now"
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
              <Input
                value={s.duration}
                onChange={(e) => update(i, { duration: e.target.value })}
                placeholder="30 min"
                className="h-8 text-sm w-24"
              />
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
    </div>
  );
}

export const appointmentBookingBlock: BlockModule<typeof schema> = {
  type: 'appointment-booking',
  name: 'Appointment Booking',
  description: 'Let visitors book lessons, auditions, or consultations through your scheduling link.',
  icon: CalendarClock,
  tier: 'addon',
  requiredAddon: 'appointments',
  group: 'addon',
  poweredBy: 'Appointments',
  configSchema: schema,
  defaultConfig: { heading: 'Book an appointment', intro: '', bookingUrl: '', ctaLabel: 'Book now', services: [] },
  EditorForm,
  Render,
};
