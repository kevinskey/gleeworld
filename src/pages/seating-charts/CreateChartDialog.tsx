// Create-chart wizard, compressed to 3 steps: Purpose → Template → Name.
// Roster + geometry choices happen in the editor after creation.
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ALL_TEMPLATES, CATEGORY_LABELS, templatesByCategory } from '@/features/seating-charts/templates';
import type { SeatingChartMode, TemplateCategory } from '@/types/seatingCharts';

export type CreatePurpose =
  | { key: 'performance';   label: 'Performance';         defaultCategory: 'choir' }
  | { key: 'rehearsal';     label: 'Rehearsal';           defaultCategory: 'choir' }
  | { key: 'classroom';     label: 'Classroom';           defaultCategory: 'classroom' }
  | { key: 'choir_risers';  label: 'Choir Risers';        defaultCategory: 'choir' }
  | { key: 'instrumental';  label: 'Instrumental';        defaultCategory: 'band' }
  | { key: 'stage_plot';    label: 'Technical Stage Plot'; defaultCategory: 'stage_plot' }
  | { key: 'custom';        label: 'Custom';              defaultCategory: 'custom' };

const PURPOSES: CreatePurpose[] = [
  { key: 'performance',  label: 'Performance',          defaultCategory: 'choir' },
  { key: 'rehearsal',    label: 'Rehearsal',            defaultCategory: 'choir' },
  { key: 'classroom',    label: 'Classroom',            defaultCategory: 'classroom' },
  { key: 'choir_risers', label: 'Choir Risers',         defaultCategory: 'choir' },
  { key: 'instrumental', label: 'Instrumental',         defaultCategory: 'band' },
  { key: 'stage_plot',   label: 'Technical Stage Plot', defaultCategory: 'stage_plot' },
  { key: 'custom',       label: 'Custom',               defaultCategory: 'custom' },
];

export interface CreateChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string; description: string; template_key: string; chart_mode: SeatingChartMode }) => Promise<void>;
}

export function CreateChartDialog({ open, onOpenChange, onCreate }: CreateChartDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [purpose, setPurpose] = useState<CreatePurpose | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const byCategory = useMemo(() => templatesByCategory(), []);

  function reset() {
    setStep(1); setPurpose(null); setTemplateKey(null); setName(''); setDescription(''); setSaving(false);
  }

  function pickPurpose(p: CreatePurpose) {
    setPurpose(p);
    setStep(2);
  }

  const templateChoices = useMemo(() => {
    if (!purpose) return ALL_TEMPLATES;
    if (purpose.key === 'custom') return byCategory.custom;
    if (purpose.key === 'stage_plot') return byCategory.stage_plot.concat(byCategory.other_music.filter((t) => t.category === 'stage_plot' as TemplateCategory));
    if (purpose.key === 'classroom') return byCategory.classroom;
    if (purpose.key === 'instrumental') return [...byCategory.band, ...byCategory.orchestra];
    if (purpose.key === 'choir_risers') return byCategory.choir;
    return byCategory[purpose.defaultCategory as TemplateCategory] ?? ALL_TEMPLATES;
  }, [purpose, byCategory]);

  async function submit() {
    if (!templateKey || !name) return;
    setSaving(true);
    try {
      const mode: SeatingChartMode = purpose?.key === 'stage_plot' ? 'stage_plot'
        : purpose?.key === 'classroom' ? 'classroom' : 'seating';
      await onCreate({ name: name.trim(), description: description.trim(), template_key: templateKey, chart_mode: mode });
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create seating chart</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PURPOSES.map((p) => (
              <Card key={p.key} className="cursor-pointer hover:border-primary" onClick={() => pickPurpose(p)}>
                <CardHeader>
                  <CardTitle className="text-sm">{p.label}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {step === 2 && purpose && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {templateChoices.map((t) => (
              <Card
                key={t.key}
                className={`cursor-pointer hover:border-primary ${templateKey === t.key ? 'border-primary ring-1 ring-primary' : ''}`}
                onClick={() => { setTemplateKey(t.key); setName(t.name); setStep(3); }}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                  <CardDescription className="text-xs">{t.description}</CardDescription>
                  <p className="text-xs uppercase text-muted-foreground pt-1">{CATEGORY_LABELS[t.category]}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {step === 3 && templateKey && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Chart name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Step {step} of 3</div>
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>Back</Button>}
            {step === 3 && (
              <Button onClick={submit} disabled={!name || !templateKey || saving}>
                {saving ? 'Creating…' : 'Create chart'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateChartDialog;
