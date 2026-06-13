import { z } from 'zod';
import { Star, Plus, Trash2, GripVertical, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Graduate spotlight'),
  intro: z.string().default(''),
  layout: z.enum(['cards', 'quotes']).default('cards'),
  graduates: z.array(z.object({
    name: z.string().default(''),
    classYear: z.string().default(''),
    nowDoing: z.string().default(''),
    story: z.string().default(''),
    photoUrl: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  const list = config.graduates.filter((g) => g.name);
  if (list.length === 0) return null;
  return (
    <section id="graduates" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <Star className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      {config.layout === 'cards' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((g, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
              {g.photoUrl && <img src={g.photoUrl} alt={g.name} className="w-full aspect-square object-cover" />}
              <div className="p-4 flex-1">
                <h3 className="font-semibold text-lg leading-snug normal-case">{g.name}</h3>
                {(g.classYear || g.nowDoing) && (
                  <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'var(--site-accent)' }}>
                    {[g.classYear, g.nowDoing].filter(Boolean).join(' · ')}
                  </div>
                )}
                {g.story && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{g.story}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {list.map((g, i) => (
            <blockquote key={i} className="rounded-xl border border-border bg-card p-5 relative">
              <Quote className="absolute top-3 right-3 w-6 h-6 opacity-20" style={{ color: 'var(--site-accent)' }} />
              {g.story && (
                <p className="text-sm sm:text-base text-foreground leading-relaxed italic">"{g.story}"</p>
              )}
              <div className="flex items-center gap-3 mt-4">
                {g.photoUrl && <img src={g.photoUrl} alt={g.name} className="w-10 h-10 rounded-full object-cover" />}
                <div>
                  <div className="font-semibold text-sm">{g.name}</div>
                  {(g.classYear || g.nowDoing) && (
                    <div className="text-xs text-muted-foreground">
                      {[g.classYear, g.nowDoing].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['graduates'][number]>) =>
    set({ graduates: config.graduates.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  const remove = (i: number) => set({ graduates: config.graduates.filter((_, j) => j !== i) });
  const add = () =>
    set({ graduates: [...config.graduates, { name: '', classYear: '', nowDoing: '', story: '', photoUrl: '' }] });

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
            <SelectItem value="cards">Photo cards</SelectItem>
            <SelectItem value="quotes">Pull quotes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Featured graduates</Label>
        {config.graduates.length === 0 && (
          <p className="text-xs text-slate-500">Spotlight alumnae and graduates with their stories and where they are now.</p>
        )}
        {config.graduates.map((g, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Graduate {i + 1}</span>
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
              prefix="grad"
              thumbClass="w-14 h-14 rounded-full"
              value={g.photoUrl}
              onChange={(url) => update(i, { photoUrl: url })}
              buttonColor={theme?.primaryColor}
            />
            <Input
              value={g.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Name"
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={g.classYear}
                onChange={(e) => update(i, { classYear: e.target.value })}
                placeholder="Class of '15"
                className="h-8 text-sm"
              />
              <Input
                value={g.nowDoing}
                onChange={(e) => update(i, { nowDoing: e.target.value })}
                placeholder="Now: Soloist, Met Opera"
                className="h-8 text-sm"
              />
            </div>
            <Textarea
              value={g.story}
              onChange={(e) => update(i, { story: e.target.value })}
              placeholder="Their story, in their words."
              rows={3}
              className="text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add graduate
        </Button>
      </div>
    </div>
  );
}

export const alumniSpotlightBlock: BlockModule<typeof schema> = {
  type: 'alumni-spotlight',
  name: 'Graduate Spotlight',
  description: 'Spotlight graduates with photos, class years, and where they are now.',
  icon: Star,
  tier: 'addon',
  requiredAddon: 'alumni',
  group: 'addon',
  poweredBy: 'Alumni Engagement',
  configSchema: schema,
  defaultConfig: { heading: 'Graduate spotlight', intro: '', layout: 'cards', graduates: [] },
  EditorForm,
  Render,
};
