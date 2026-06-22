import { z } from 'zod';
import { Sparkles, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

// Generic person-spotlight: handles students, graduates, faculty, honorees
// in a single block. Tenants pick the role label per person so a fan
// page can mix a current first-soprano with a Grammy-winning graduate
// without needing two separate sections.
const schema = z.object({
  heading: z.string().default('Spotlight'),
  intro: z.string().default(''),
  layout: z.enum(['cards', 'list']).default('cards'),
  people: z.array(z.object({
    name: z.string().default(''),
    role: z.enum(['student', 'graduate', 'faculty', 'honoree']).default('student'),
    detail: z.string().default(''),    // class year for student/grad, title for faculty, etc.
    blurb: z.string().default(''),
    photoUrl: z.string().default(''),
    linkUrl: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

const ROLE_LABEL: Record<Config['people'][number]['role'], string> = {
  student: 'Student',
  graduate: 'Graduate',
  faculty: 'Faculty',
  honoree: 'Honoree',
};

function Render({ config }: BlockRenderProps<Config>) {
  const list = config.people.filter((p) => p.name);
  if (list.length === 0) return null;
  return (
    <section id="spotlight" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      {config.layout === 'cards' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((p, i) => {
            const card = (
              <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-full">
                {p.photoUrl && <img src={p.photoUrl} alt={p.name} className="w-full aspect-square object-cover" />}
                <div className="p-4 flex-1">
                  <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--site-accent)' }}>
                    {ROLE_LABEL[p.role]}
                  </div>
                  <h3 className="font-semibold text-lg leading-snug normal-case mt-1">{p.name}</h3>
                  {p.detail && <div className="text-xs text-muted-foreground mt-0.5">{p.detail}</div>}
                  {p.blurb && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.blurb}</p>}
                </div>
              </div>
            );
            return p.linkUrl ? (
              <a key={i} href={p.linkUrl} target="_blank" rel="noreferrer" className="hover:opacity-90 transition-opacity">{card}</a>
            ) : <div key={i}>{card}</div>;
          })}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {list.map((p, i) => (
            <li key={i} className="p-4 flex items-center gap-4">
              {p.photoUrl
                ? <img src={p.photoUrl} alt={p.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                : <div className="w-14 h-14 rounded-full bg-muted shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded" style={{ background: 'var(--site-accent)', color: 'white' }}>
                    {ROLE_LABEL[p.role]}
                  </span>
                  {p.detail && <span className="text-xs text-muted-foreground">{p.detail}</span>}
                </div>
                {p.blurb && <p className="text-sm text-muted-foreground mt-1 leading-snug">{p.blurb}</p>}
              </div>
              {p.linkUrl && (
                <a href={p.linkUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold shrink-0" style={{ color: 'var(--site-accent)' }}>
                  View →
                </a>
              )}
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
    set({ people: [...config.people, { name: '', role: 'student', detail: '', blurb: '', photoUrl: '', linkUrl: '' }] });

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
            <SelectItem value="list">Compact list</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Featured people</Label>
        {config.people.length === 0 && (
          <p className="text-xs text-slate-500">Highlight students, graduates, faculty, or honorees on your page.</p>
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
              prefix="spotlight"
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
            <div className="grid grid-cols-2 gap-2">
              <Select value={p.role} onValueChange={(v) => update(i, { role: v as Config['people'][number]['role'] })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="honoree">Honoree</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={p.detail}
                onChange={(e) => update(i, { detail: e.target.value })}
                placeholder="Class of '25, soprano, etc."
                className="h-8 text-sm"
              />
            </div>
            <Textarea
              value={p.blurb}
              onChange={(e) => update(i, { blurb: e.target.value })}
              placeholder="A few sentences about this person."
              rows={3}
              className="text-sm"
            />
            <Input
              value={p.linkUrl}
              onChange={(e) => update(i, { linkUrl: e.target.value })}
              placeholder="https://… (optional link to bio)"
              className="h-8 text-sm"
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

export const spotlightBlock: BlockModule<typeof schema> = {
  type: 'spotlight',
  name: 'Spotlight',
  description: 'Highlight students, graduates, faculty, or honorees with photos and short bios.',
  icon: Sparkles,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: { heading: 'Spotlight', intro: '', layout: 'cards', people: [] },
  EditorForm,
  Render,
};
