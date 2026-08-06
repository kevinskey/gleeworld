import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { NewPeriod } from '../useStipendPeriods';

const db = supabase as any;

interface Course { id: string; title: string; course_code: string | null }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: NewPeriod) => Promise<void>;
}

export function StipendPeriodForm({ open, onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<NewPeriod>({
    name: '', starts_on: '', ends_on: '',
    default_amount: 0, required_services: 1, course_ids: [],
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await db
        .from('gw_courses')
        .select('id, title, course_code')
        .order('title');
      setCourses((data ?? []) as Course[]);
    })();
  }, [open]);

  const toggleCourse = (id: string) => {
    const picked = form.course_ids ?? [];
    setForm({
      ...form,
      course_ids: picked.includes(id)
        ? picked.filter((c) => c !== id)
        : [...picked, id],
    });
  };

  const perService = form.required_services > 0
    ? form.default_amount / form.required_services : 0;

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the period.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New stipend period</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sp-name" className="text-xs">Name</Label>
            <Input id="sp-name" placeholder="Fall 2026" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sp-start" className="text-xs">Starts</Label>
              <Input id="sp-start" type="date" value={form.starts_on}
                onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sp-end" className="text-xs">Ends</Label>
              <Input id="sp-end" type="date" value={form.ends_on}
                onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sp-amount" className="text-xs">Stipend per student</Label>
              <Input id="sp-amount" type="number" min={0} step="0.01"
                value={form.default_amount}
                onChange={(e) => setForm({ ...form, default_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="sp-services" className="text-xs">Required services</Label>
              <Input id="sp-services" type="number" min={1}
                value={form.required_services}
                onChange={(e) => setForm({ ...form, required_services: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Courses that count</Label>
            <div className="mt-1 max-h-32 overflow-y-auto rounded-md border p-2 space-y-1">
              {courses.map((c) => (
                <label key={c.id}
                  className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={(form.course_ids ?? []).includes(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                  />
                  <span className="text-sm">
                    {c.title}
                    {c.course_code && (
                      <span className="text-muted-foreground"> · {c.course_code}</span>
                    )}
                  </span>
                </label>
              ))}
              {courses.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">No courses yet.</p>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Class meetings in these courses count as services. Leave empty to
              count only calendar events.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Each service is worth{' '}
            <span className="font-medium text-foreground">
              ${perService.toFixed(2)}
            </span>. Missing one reduces the stipend by that amount.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}
            disabled={saving || !form.name || !form.starts_on || !form.ends_on
                      || form.required_services < 1}>
            {saving ? 'Saving…' : 'Create period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
