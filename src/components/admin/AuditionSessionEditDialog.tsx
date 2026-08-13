// Edit an existing audition session — the missing half of the Sessions tab
// (create existed; edit did not, discovered when the public audition block
// started reading live sessions and Kevin had no way to fill in
// location/time on the one he'd already made — 2026-08-13).
//
// Every field the public site can display is here, in the same order the
// create form uses. Saving is a plain UPDATE under RLS.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export interface EditableSession {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  application_deadline: string | null;
  audition_dates: string[] | null;
  is_active: boolean;
  max_applicants?: number | null;
  requirements?: string | null;
  location?: string | null;
  time_label?: string | null;
  audition_slots?: Array<{ date: string; time: string; location?: string }> | null;
}

export function AuditionSessionEditDialog({
  session, open, onOpenChange, onSaved,
}: {
  session: EditableSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    name: session.name ?? '',
    description: session.description ?? '',
    start_date: session.start_date ?? '',
    // datetime-local wants "YYYY-MM-DDTHH:mm" in local time; slice the ISO.
    application_deadline: session.application_deadline
      ? session.application_deadline.slice(0, 16)
      : '',
    slots: (session.audition_slots ?? []).map((s) => ({ date: s.date ?? '', time: s.time ?? '', location: s.location ?? '' })),
    max_applicants: session.max_applicants != null ? String(session.max_applicants) : '',
    requirements: session.requirements ?? '',
    location: session.location ?? '',
    is_active: session.is_active,
  }));
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('audition_sessions')
      .update({
        name: form.name.trim(),
        description: form.description || null,
        start_date: form.start_date || null,
        application_deadline: form.application_deadline
          ? new Date(form.application_deadline).toISOString()
          : null,
        audition_slots: form.slots.filter((s) => s.date),
        // Legacy label list stays in sync for anything still reading it.
        audition_dates: form.slots
          .filter((s) => s.date)
          .map((s) => new Date(`${s.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })),
        max_applicants: form.max_applicants ? parseInt(form.max_applicants, 10) : null,
        requirements: form.requirements || null,
        location: form.location || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', session.id)
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Session updated', description: 'Your public site reflects it within a minute.' });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            The active session powers the Auditions section of your public site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Shown on your public site and open for promotion from signups.</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Session name</Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Performance date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
              <p className="text-xs text-muted-foreground">The concert or event they are auditioning for.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Audition location</Label>
              <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Music Building, Rm 210" />
              <p className="text-xs text-muted-foreground">Used for any audition date without its own location.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Audition dates</Label>
            {form.slots.length === 0 && (
              <p className="text-xs text-muted-foreground">No audition dates yet — add the days and times singers can come.</p>
            )}
            {form.slots.map((slot, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Input
                  type="date"
                  value={slot.date}
                  onChange={(e) => set({ slots: form.slots.map((s, j) => (j === i ? { ...s, date: e.target.value } : s)) })}
                />
                <Input
                  value={slot.time}
                  placeholder="6:00 – 8:00 PM"
                  onChange={(e) => set({ slots: form.slots.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)) })}
                />
                <Input
                  value={slot.location}
                  placeholder="(default location)"
                  onChange={(e) => set({ slots: form.slots.map((s, j) => (j === i ? { ...s, location: e.target.value } : s)) })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => set({ slots: form.slots.filter((_, j) => j !== i) })}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set({ slots: [...form.slots, { date: '', time: '', location: '' }] })}
            >
              + Add audition date
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Application deadline</Label>
              <Input type="datetime-local" value={form.application_deadline} onChange={(e) => set({ application_deadline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Max applicants</Label>
              <Input type="number" value={form.max_applicants} onChange={(e) => set({ max_applicants: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Requirements (one per line — shown as numbered cards)</Label>
            <Textarea
              value={form.requirements}
              onChange={(e) => set({ requirements: e.target.value })}
              rows={4}
              placeholder={'One prepared piece — any style, three minutes or fewer\nSight-singing — a brief passage in a major or minor key'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
