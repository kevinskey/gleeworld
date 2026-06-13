import { z } from 'zod';
import { Users, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Director & Staff'),
  layout: z.enum(['grid', 'list']).default('grid'),
  people: z.array(z.object({
    name: z.string().default(''),
    title: z.string().default(''),
    bio: z.string().default(''),
    photoUrl: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  const people = config.people.filter((p) => p.name);
  if (people.length === 0) return null;
  return (
    <section id="staff" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Users className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.layout === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((p, i) => (
            <div key={i} className="text-center">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt={p.name} className="w-32 h-32 mx-auto rounded-full object-cover mb-3" />
              ) : (
                <div className="w-32 h-32 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="font-semibold">{p.name}</div>
              {p.title && (
                <div className="text-sm uppercase tracking-wide" style={{ color: 'var(--site-accent)' }}>
                  {p.title}
                </div>
              )}
              {p.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.bio}</p>}
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {people.map((p, i) => (
            <li key={i} className="flex gap-4 p-4">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt={p.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.name}</div>
                {p.title && (
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-accent)' }}>
                    {p.title}
                  </div>
                )}
                {p.bio && <p className="text-sm text-muted-foreground mt-1">{p.bio}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['people'][number]>) =>
    set({ people: config.people.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const remove = (i: number) => set({ people: config.people.filter((_, j) => j !== i) });
  const add = () =>
    set({ people: [...config.people, { name: '', title: '', bio: '', photoUrl: '' }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Layout</Label>
        <Select value={config.layout} onValueChange={(v) => set({ layout: v as Config['layout'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Photo grid</SelectItem>
            <SelectItem value="list">Compact list</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>People</Label>
        {config.people.length === 0 && (
          <p className="text-xs text-slate-500">Add directors, accompanists, leadership — anyone you want to feature.</p>
        )}
        {config.people.map((p, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Person {i + 1}</span>
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
              prefix="staff"
              thumbClass="w-14 h-14 rounded-full"
              value={p.photoUrl}
              onChange={(url) => update(i, { photoUrl: url })}
              buttonColor={theme?.primaryColor}
            />
            <Input
              value={p.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Name"
              className="h-8 text-sm"
            />
            <Input
              value={p.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Title (e.g. Artistic Director)"
              className="h-8 text-sm"
            />
            <Textarea
              value={p.bio}
              onChange={(e) => update(i, { bio: e.target.value })}
              placeholder="Short bio (optional)"
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add person
        </Button>
      </div>
    </div>
  );
}

export const staffBlock: BlockModule<typeof schema> = {
  type: 'staff',
  name: 'Director & Staff',
  description: 'Showcase your artistic director, accompanist, leadership, and staff with photos and bios.',
  icon: Users,
  tier: 'free',
  group: 'gleeworld',
  poweredBy: 'User Management',
  configSchema: schema,
  defaultConfig: { heading: 'Director & Staff', layout: 'grid', people: [] },
  EditorForm,
  Render,
};
