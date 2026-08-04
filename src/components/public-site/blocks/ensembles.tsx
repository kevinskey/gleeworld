import { z } from 'zod';
import { MicVocal, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';
import { EmptyBlockPlaceholder } from '../EmptyBlockPlaceholder';

const schema = z.object({
  heading: z.string().default('Our Choirs & Ensembles'),
  intro: z.string().default(''),
  ensembles: z.array(z.object({
    name: z.string().default(''),
    description: z.string().default(''),
    imageUrl: z.string().default(''),
    ctaLabel: z.string().default(''),
    ctaUrl: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const items = config.ensembles.filter((e) => e.name);
  if (items.length === 0) return onConfigChange ? <EmptyBlockPlaceholder name="Choirs & Ensembles" /> : null;
  return (
    <section id="ensembles" className="max-w-6xl mx-auto px-4 cq-sm:px-6 py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <MicVocal className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      <div className="grid cq-sm:grid-cols-2 cq-lg:grid-cols-3 gap-5">
        {items.map((e, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            {e.imageUrl ? (
              <img src={e.imageUrl} alt={e.name} className="w-full aspect-video object-cover" />
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center">
                <MicVocal className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg leading-snug normal-case">{e.name}</h3>
              {e.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed flex-1">{e.description}</p>
              )}
              {e.ctaLabel && e.ctaUrl && (
                <a
                  href={e.ctaUrl}
                  className="text-sm font-medium mt-3 hover:underline self-start"
                  style={{ color: 'var(--site-accent)' }}
                >
                  {e.ctaLabel} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['ensembles'][number]>) =>
    set({ ensembles: config.ensembles.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const remove = (i: number) => set({ ensembles: config.ensembles.filter((_, j) => j !== i) });
  const add = () =>
    set({ ensembles: [...config.ensembles, { name: '', description: '', imageUrl: '', ctaLabel: '', ctaUrl: '' }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro paragraph (optional)</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Ensembles</Label>
        {config.ensembles.length === 0 && (
          <p className="text-xs text-slate-500">Add the choirs, ensembles, or programs your organization offers.</p>
        )}
        {config.ensembles.map((e, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Ensemble {i + 1}</span>
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
              prefix="ensemble"
              thumbClass="w-16 h-16"
              value={e.imageUrl}
              onChange={(url) => update(i, { imageUrl: url })}
              buttonColor={theme?.primaryColor}
            />
            <Input
              value={e.name}
              onChange={(ev) => update(i, { name: ev.target.value })}
              placeholder="Ensemble name (e.g. Chamber Choir)"
              className="h-8 text-sm"
            />
            <Textarea
              value={e.description}
              onChange={(ev) => update(i, { description: ev.target.value })}
              placeholder="A short description of what makes this ensemble special."
              rows={2}
              className="text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={e.ctaLabel}
                onChange={(ev) => update(i, { ctaLabel: ev.target.value })}
                placeholder="Link text (optional)"
                className="h-8 text-sm"
              />
              <Input
                value={e.ctaUrl}
                onChange={(ev) => update(i, { ctaUrl: ev.target.value })}
                placeholder="https://… or #section"
                className="h-8 text-sm"
              />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add ensemble
        </Button>
      </div>
    </div>
  );
}

export const ensemblesBlock: BlockModule<typeof schema> = {
  type: 'ensembles',
  name: 'Choirs & Ensembles',
  description: 'Showcase the choirs, ensembles, or programs your organization offers.',
  icon: MicVocal,
  tier: 'free',
  group: 'gleeworld',
  poweredBy: 'Glee Academy',
  configSchema: schema,
  defaultConfig: { heading: 'Our Choirs & Ensembles', intro: '', ensembles: [] },
  EditorForm,
  Render,
};
