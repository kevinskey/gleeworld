import { z } from 'zod';
import { GraduationCap, Plus, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';
import { EmptyBlockPlaceholder } from '../EmptyBlockPlaceholder';

// Scholarship block: lists scholarships the ensemble offers or sponsors,
// with optional past recipients. Each award has a title, amount, deadline,
// sponsor/donor, description, and an apply/learn-more link.
const schema = z.object({
  heading: z.string().default('Scholarships'),
  intro: z.string().default(''),
  scholarships: z.array(z.object({
    name: z.string().default(''),
    sponsor: z.string().default(''),
    amount: z.string().default(''),      // free-form so tenants can write "$1,000" or "Full tuition"
    deadline: z.string().default(''),    // free-form date string
    description: z.string().default(''),
    applyUrl: z.string().default(''),
    recipients: z.string().default(''),  // optional past recipients line
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const list = config.scholarships.filter((s) => s.name);
  if (list.length === 0) return onConfigChange ? <EmptyBlockPlaceholder name="Scholarships" /> : null;
  return (
    <section id="scholarships" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <GraduationCap className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.intro && <p className="text-muted-foreground mb-8 max-w-3xl">{config.intro}</p>}
      <div className="grid sm:grid-cols-2 gap-5">
        {list.map((s, i) => (
          <article key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col">
            <header className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg leading-snug normal-case">{s.name}</h3>
                {s.sponsor && (
                  <div className="text-xs text-muted-foreground mt-0.5">Sponsored by {s.sponsor}</div>
                )}
              </div>
              {s.amount && (
                <div className="text-xs uppercase tracking-wide font-bold px-2.5 py-1 rounded shrink-0" style={{ background: 'var(--site-accent)', color: 'white' }}>
                  {s.amount}
                </div>
              )}
            </header>
            {s.description && (
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{s.description}</p>
            )}
            <footer className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground min-w-0">
                {s.deadline && <div><span className="font-semibold">Deadline:</span> {s.deadline}</div>}
                {s.recipients && <div className="truncate"><span className="font-semibold">Recent recipients:</span> {s.recipients}</div>}
              </div>
              {s.applyUrl && (
                <a
                  href={s.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                  style={{ color: 'var(--site-accent)' }}
                >
                  Apply <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const update = (i: number, patch: Partial<Config['scholarships'][number]>) =>
    set({ scholarships: config.scholarships.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const remove = (i: number) => set({ scholarships: config.scholarships.filter((_, j) => j !== i) });
  const add = () =>
    set({ scholarships: [...config.scholarships, { name: '', sponsor: '', amount: '', deadline: '', description: '', applyUrl: '', recipients: '' }] });

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
      <div className="space-y-2">
        <Label>Scholarships</Label>
        {config.scholarships.length === 0 && (
          <p className="text-xs text-slate-500">Add scholarships your ensemble offers or sponsors.</p>
        )}
        {config.scholarships.map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 flex-1">Scholarship {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Scholarship name"
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={s.sponsor}
                onChange={(e) => update(i, { sponsor: e.target.value })}
                placeholder="Sponsor / donor"
                className="h-8 text-sm"
              />
              <Input
                value={s.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
                placeholder="$1,000 or Full tuition"
                className="h-8 text-sm"
              />
            </div>
            <Input
              value={s.deadline}
              onChange={(e) => update(i, { deadline: e.target.value })}
              placeholder="Deadline (e.g. March 15, 2027)"
              className="h-8 text-sm"
            />
            <Textarea
              value={s.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="What the scholarship covers and who it's for."
              rows={3}
              className="text-sm"
            />
            <Input
              value={s.recipients}
              onChange={(e) => update(i, { recipients: e.target.value })}
              placeholder="Recent recipients (optional)"
              className="h-8 text-sm"
            />
            <Input
              value={s.applyUrl}
              onChange={(e) => update(i, { applyUrl: e.target.value })}
              placeholder="https://… apply or learn more"
              className="h-8 text-sm"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add scholarship
        </Button>
      </div>
    </div>
  );
}

export const scholarshipBlock: BlockModule<typeof schema> = {
  type: 'scholarship',
  name: 'Scholarships',
  description: 'List scholarships your ensemble offers with amounts, deadlines, and apply links.',
  icon: GraduationCap,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: { heading: 'Scholarships', intro: '', scholarships: [] },
  EditorForm,
  Render,
};
