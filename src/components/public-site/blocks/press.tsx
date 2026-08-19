import { z } from 'zod';
import { Newspaper, Plus, Trash2, GripVertical, ExternalLink, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';
import { EmptyBlockPlaceholder } from '../EmptyBlockPlaceholder';

const schema = z.object({
  heading: z.string().default('Press & Recognition'),
  intro: z.string().default(''),
  layout: z.enum(['list', 'logo-wall']).default('list'),
  items: z.array(z.object({
    outlet: z.string().default(''),
    quote: z.string().default(''),
    date: z.string().default(''),
    url: z.string().default(''),
    logoUrl: z.string().default(''),
    kind: z.enum(['press', 'award']).default('press'),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const items = config.items.filter((i) => i.outlet || i.quote);
  if (items.length === 0) return onConfigChange ? <EmptyBlockPlaceholder name="Press" /> : null;
  return (
    <section id="press" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <Newspaper className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      {config.layout === 'list' ? (
        <div className="grid cq-sm:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <article key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                {it.logoUrl ? (
                  <img src={it.logoUrl} alt={it.outlet} className="h-10 w-auto object-contain shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                    {it.kind === 'award'
                      ? <Award className="w-5 h-5 text-muted-foreground" />
                      : <Newspaper className="w-5 h-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm">{it.outlet}</span>
                    {it.date && <span className="text-xs text-muted-foreground">{it.date}</span>}
                  </div>
                </div>
              </div>
              {it.quote && (
                <blockquote className="text-sm leading-relaxed mt-3 italic text-foreground">
                  "{it.quote}"
                </blockquote>
              )}
              {it.url && (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium mt-3 hover:underline"
                  style={{ color: 'var(--site-accent)' }}
                >
                  Read more <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-90">
          {items.map((it, i) =>
            it.logoUrl ? (
              it.url ? (
                <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" title={it.outlet}>
                  <img src={it.logoUrl} alt={it.outlet} className="h-12 cq-sm:h-16 w-auto object-contain grayscale hover:grayscale-0 transition" />
                </a>
              ) : (
                <img key={i} src={it.logoUrl} alt={it.outlet} title={it.outlet} className="h-12 cq-sm:h-16 w-auto object-contain grayscale" />
              )
            ) : (
              <span key={i} className="font-semibold text-lg text-muted-foreground">{it.outlet}</span>
            )
          )}
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['items'][number]>) =>
    set({ items: config.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const remove = (i: number) => set({ items: config.items.filter((_, j) => j !== i) });
  const add = () =>
    set({ items: [...config.items, { outlet: '', quote: '', date: '', url: '', logoUrl: '', kind: 'press' }] });

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
      <div className="space-y-1.5">
        <Label>Layout</Label>
        <Select value={config.layout} onValueChange={(v) => set({ layout: v as Config['layout'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="list">Quotes & reviews</SelectItem>
            <SelectItem value="logo-wall">Logo wall</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Items</Label>
        {config.items.length === 0 && (
          <p className="text-xs text-slate-500">Press coverage, awards, or recognition you want to feature.</p>
        )}
        {config.items.map((it, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Item {i + 1}</span>
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
              prefix="press"
              thumbClass="w-16 h-10"
              value={it.logoUrl}
              onChange={(url) => update(i, { logoUrl: url })}
              buttonColor={theme?.primaryColor}
            />
            <Input
              value={it.outlet}
              onChange={(e) => update(i, { outlet: e.target.value })}
              placeholder='Outlet (e.g. "The New York Times")'
              className="h-8 text-sm"
            />
            <Textarea
              value={it.quote}
              onChange={(e) => update(i, { quote: e.target.value })}
              placeholder="Pull quote or award description (optional)"
              rows={2}
              className="text-sm"
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                value={it.date}
                onChange={(e) => update(i, { date: e.target.value })}
                placeholder="Date (e.g. May 2025)"
                className="h-8 text-sm"
              />
              <Select value={it.kind} onValueChange={(v) => update(i, { kind: v as Config['items'][number]['kind'] })}>
                <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="press">Press</SelectItem>
                  <SelectItem value="award">Award</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={it.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://… (optional link)"
              className="h-8 text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add item
        </Button>
      </div>
    </div>
  );
}

export const pressBlock: BlockModule<typeof schema> = {
  type: 'press',
  name: 'Press & Recognition',
  description: 'Reviews, press coverage, awards, and achievements — quotes or a logo wall.',
  icon: Newspaper,
  tier: 'free',
  group: 'gleeworld',
  poweredBy: 'Public Relations',
  configSchema: schema,
  defaultConfig: { heading: 'Press & Recognition', intro: '', layout: 'list', items: [] },
  EditorForm,
  Render,
};
