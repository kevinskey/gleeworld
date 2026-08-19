import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useStipendAwards, type StipendPeriod } from '../useStipendPeriods';

const db = supabase as any;

interface Person { user_id: string; full_name: string | null; email: string | null }

interface Props {
  period: StipendPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
}

export function EnrollStudentsDialog({ period, open, onOpenChange, onEnrolled }: Props) {
  const { enroll } = useStipendAwards(period.id);
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await db
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .eq('disabled', false)
        .order('full_name');
      setPeople((data ?? []).filter((p: Person) => p.user_id) as Person[]);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q));
  }, [people, query]);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await enroll([...picked], period.default_amount);
      setPicked(new Set());
      onEnrolled();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enroll students.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add students to {period.name}</DialogTitle></DialogHeader>
        <Input placeholder="Search students…" value={query}
          onChange={(e) => setQuery(e.target.value)} className="text-sm" />
        <ScrollArea className="h-64 rounded-md border">
          <div className="p-2 space-y-1">
            {filtered.map((p) => (
              <label key={p.user_id}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer">
                <Checkbox checked={picked.has(p.user_id)}
                  onCheckedChange={() => toggle(p.user_id)} />
                <span className="text-sm">{p.full_name ?? p.email ?? 'Unknown'}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No students match.</p>
            )}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Each student starts at the period amount and can be adjusted individually.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || picked.size === 0}>
            {saving ? 'Adding…' : `Add ${picked.size} student${picked.size === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
