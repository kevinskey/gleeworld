import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { FeeTemplate } from '@/hooks/useFeeTemplates';

interface Rollup {
  collected: number;
  expected: number;
  paid: number;
  total: number;
}

export function FeeTemplateRollup({ template }: { template: FeeTemplate }) {
  const [rollup, setRollup] = useState<Rollup>({
    collected: 0,
    expected: 0,
    paid: 0,
    total: 0,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gw_student_fees')
        .select('amount, paid_amount, status')
        .eq('template_id', template.id);
      const rows = (data ?? []) as { amount: number; paid_amount: number; status: string }[];
      const expected = rows.reduce((s, r) => s + Number(r.amount), 0);
      const collected = rows.reduce((s, r) => s + Number(r.paid_amount), 0);
      const paid = rows.filter(r => r.status === 'paid').length;
      setRollup({ collected, expected, paid, total: rows.length });
    })();
  }, [template.id]);

  const pct = rollup.expected
    ? Math.round((rollup.collected / rollup.expected) * 100)
    : 0;

  return (
    <Card className="p-4 bg-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">{template.name}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {template.category}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">
            ${rollup.collected.toFixed(0)} / ${rollup.expected.toFixed(0)} collected
          </div>
          <div className="text-muted-foreground text-xs">
            {rollup.paid} / {rollup.total} paid
          </div>
        </div>
      </div>
      <Progress value={pct} className="h-2" />
    </Card>
  );
}
