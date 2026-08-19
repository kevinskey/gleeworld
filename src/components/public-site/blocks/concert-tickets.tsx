import { z } from 'zod';
import { Ticket, Plus, Trash2, GripVertical, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';
import { EmptyBlockPlaceholder } from '../EmptyBlockPlaceholder';

const schema = z.object({
  heading: z.string().default('Buy tickets'),
  intro: z.string().default(''),
  shows: z.array(z.object({
    title: z.string().default(''),
    date: z.string().default(''),
    venue: z.string().default(''),
    ticketUrl: z.string().default(''),
    imageUrl: z.string().default(''),
    priceFrom: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const shows = config.shows.filter((s) => s.title);
  if (shows.length === 0) return onConfigChange ? <EmptyBlockPlaceholder name="Concert Tickets" /> : null;
  return (
    <section id="tickets" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <Ticket className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      <div className="grid cq-sm:grid-cols-2 cq-lg:grid-cols-3 gap-5">
        {shows.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            {s.imageUrl && <img src={s.imageUrl} alt={s.title} className="w-full aspect-video object-cover" />}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg leading-snug normal-case">{s.title}</h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {s.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{formatDate(s.date)}</span>
                  </div>
                )}
                {s.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{s.venue}</span>
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between mt-4 gap-2">
                {s.priceFrom && (
                  <span className="text-xs text-muted-foreground">From <strong className="text-foreground">{s.priceFrom}</strong></span>
                )}
                {s.ticketUrl && (
                  <a
                    href={s.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-white"
                    style={{ background: 'var(--site-accent)' }}
                  >
                    <Ticket className="w-3.5 h-3.5" /> Tickets
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['shows'][number]>) =>
    set({ shows: config.shows.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const remove = (i: number) => set({ shows: config.shows.filter((_, j) => j !== i) });
  const add = () =>
    set({ shows: [...config.shows, { title: '', date: '', venue: '', ticketUrl: '', imageUrl: '', priceFrom: '' }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro (optional)</Label>
        <Input value={config.intro} onChange={(e) => set({ intro: e.target.value })} placeholder="A short line above the show grid." />
      </div>
      <div className="space-y-2">
        <Label>Shows</Label>
        {config.shows.length === 0 && (
          <p className="text-xs text-slate-500">Add the upcoming shows where visitors can buy tickets.</p>
        )}
        {config.shows.map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Show {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <ImageUploadField
              label=""
              prefix="show"
              thumbClass="w-16 h-16"
              value={s.imageUrl}
              onChange={(url) => update(i, { imageUrl: url })}
              buttonColor={theme?.primaryColor}
            />
            <Input
              value={s.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Show title"
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="datetime-local"
                value={s.date}
                onChange={(e) => update(i, { date: e.target.value })}
                className="h-8 text-sm"
              />
              <Input
                value={s.priceFrom}
                onChange={(e) => update(i, { priceFrom: e.target.value })}
                placeholder="From $25"
                className="h-8 text-sm"
              />
            </div>
            <Input
              value={s.venue}
              onChange={(e) => update(i, { venue: e.target.value })}
              placeholder="Venue"
              className="h-8 text-sm"
            />
            <Input
              value={s.ticketUrl}
              onChange={(e) => update(i, { ticketUrl: e.target.value })}
              placeholder="https://tickets.example.com/…"
              className="h-8 text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add show
        </Button>
      </div>
    </div>
  );
}

export const concertTicketsBlock: BlockModule<typeof schema> = {
  type: 'concert-tickets',
  name: 'Concert Tickets',
  description: 'Sell tickets to concerts and shows. Each show links out to your ticketing provider.',
  icon: Ticket,
  tier: 'addon',
  requiredAddon: 'tickets',
  group: 'addon',
  poweredBy: 'Concert Tickets',
  configSchema: schema,
  defaultConfig: { heading: 'Buy tickets', intro: '', shows: [] },
  EditorForm,
  Render,
};
