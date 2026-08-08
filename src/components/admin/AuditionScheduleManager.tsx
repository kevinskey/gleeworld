// Audition schedule editor — the missing write path for audition_time_blocks.
//
// Until this existed, `audition_time_blocks` had NO insert/update/delete
// anywhere in the app or the edge functions: two read-only hooks and nothing
// else. The table was empty platform-wide, so the applicant's date picker was
// always empty and the audition interview could not be completed by anyone.
// Measured before this shipped: 0 rows, 0 audition applications ever, and one
// real tenant (a high-school chorus) publishing an audition page with no dates.
//
// Tenant scoping is handled by the database, not here: `tenant_id` DEFAULTs to
// current_tenant_id() on insert, and a RESTRICTIVE `tenant_isolation_restrict`
// policy ANDs `tenant_id = current_tenant_id()` onto every statement. So a
// director can only ever see and edit their own dates.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  buildBlockRange,
  describeBlock,
  slotCount,
  validateDraft,
  type ScheduleDraft,
} from './auditionSchedule';

interface Block {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
  appointment_duration_minutes: number | null;
}

const EMPTY_DRAFT: ScheduleDraft = {
  date: '',
  startTime: '10:00',
  endTime: '16:00',
  durationMinutes: 15,
};

export function AuditionScheduleManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ScheduleDraft>(EMPTY_DRAFT);

  const { data: blocks = [], isLoading } = useQuery<Block[]>({
    queryKey: ['audition_time_blocks_admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audition_time_blocks')
        .select('id, start_date, end_date, is_active, appointment_duration_minutes')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Block[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['audition_time_blocks_admin'] });

  const addBlock = useMutation({
    mutationFn: async (d: ScheduleDraft) => {
      const range = buildBlockRange(d);
      // .select() is deliberate: an RLS rejection returns no error on a bare
      // insert, so without reading a row back a blocked write looks like a
      // success and the date silently never appears.
      const { data, error } = await supabase
        .from('audition_time_blocks')
        .insert({
          start_date: range.start_date,
          end_date: range.end_date,
          appointment_duration_minutes: d.durationMinutes,
          is_active: true,
        })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          'The date was not saved. Your account may not have permission to edit auditions.',
        );
      }
      return data;
    },
    onSuccess: () => {
      setDraft({ ...EMPTY_DRAFT });
      invalidate();
      toast({ title: 'Audition date added', description: 'Applicants can book it now.' });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't add that date", description: e.message, variant: 'destructive' }),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('audition_time_blocks')
        .update({ is_active: active })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('That change was not saved.');
    },
    onSuccess: invalidate,
    onError: (e: Error) =>
      toast({ title: "Couldn't update that date", description: e.message, variant: 'destructive' }),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('audition_time_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Audition date removed' });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't remove that date", description: e.message, variant: 'destructive' }),
  });

  const problem = validateDraft(draft);
  const preview = slotCount(draft);
  const activeCount = blocks.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">
      {!isLoading && activeCount === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">No audition dates are published.</p>
            <p className="text-amber-800">
              Your audition page is live, but applicants reach the scheduling step and find an
              empty date picker — they cannot finish. Add at least one date below.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add an audition date</CardTitle>
          <CardDescription>
            One row per day. Times are Eastern, which is what applicants see.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="aud-date">Date</Label>
              <Input
                id="aud-date"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-start">Starts</Label>
              <Input
                id="aud-start"
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-end">Ends</Label>
              <Input
                id="aud-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-dur">Minutes per audition</Label>
              <Input
                id="aud-dur"
                type="number"
                min={1}
                value={draft.durationMinutes}
                onChange={(e) =>
                  setDraft({ ...draft, durationMinutes: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => addBlock.mutate(draft)}
              disabled={!!problem || addBlock.isPending}
            >
              {addBlock.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="mr-2 h-4 w-4" />
              )}
              Add date
            </Button>
            <p className="text-sm text-muted-foreground">
              {problem ?? `${preview} audition slot${preview === 1 ? '' : 's'} on this day.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled dates</CardTitle>
          <CardDescription>
            Turning a date off hides it from applicants without deleting it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dates yet. Add one above and it appears on your audition page immediately.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {blocks.map((b) => {
                const d = describeBlock(b);
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{d.day}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.window} · {d.slots} slot{d.slots === 1 ? '' : 's'} ·{' '}
                        {b.appointment_duration_minutes} min each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!b.is_active}
                        onCheckedChange={(v) => setActive.mutate({ id: b.id, active: v })}
                        aria-label={`${b.is_active ? 'Hide' : 'Show'} ${d.day}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBlock.mutate(b.id)}
                        aria-label={`Remove ${d.day}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
