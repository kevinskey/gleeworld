import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_STATUS_WEIGHTS, type StatusWeights } from '../policy';

const db = supabase as any;

const LABELS: Record<string, string> = {
  present: 'Present', late: 'Late', tardy: 'Tardy',
  excused: 'Excused absence', absent: 'Absent',
};

export function StipendPolicyEditor() {
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [weights, setWeights] = useState<StatusWeights>(DEFAULT_STATUS_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await db.from('gw_stipend_policies')
        .select('id, weights').eq('is_active', true).limit(1);
      const row = (data ?? [])[0];
      if (row) { setPolicyId(row.id); setWeights(row.weights as StatusWeights); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      if (policyId) {
        const { data, error } = await db.from('gw_stipend_policies')
          .update({ weights }).eq('id', policyId).select();
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error('Nothing saved — check your permissions.');
      } else {
        const { data, error } = await db.from('gw_stipend_policies')
          .insert({ weights }).select().single();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Nothing saved — check your permissions.');
        setPolicyId(data.id);
      }
      setMessage('Saved. New amounts apply to open periods immediately.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="!text-sm">Attendance credit</CardTitle>
        <CardDescription className="text-xs">
          How much of a service each attendance status earns. 1 is full credit,
          0 earns nothing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.keys(DEFAULT_STATUS_WEIGHTS).map((status) => (
            <div key={status}>
              <Label htmlFor={`w-${status}`} className="text-xs">
                {LABELS[status] ?? status}
              </Label>
              <Input id={`w-${status}`} type="number" min={0} max={1} step="0.1"
                value={weights[status] ?? 0}
                onChange={(e) =>
                  setWeights({ ...weights, [status]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save credit rules'}
        </Button>
      </CardContent>
    </Card>
  );
}
