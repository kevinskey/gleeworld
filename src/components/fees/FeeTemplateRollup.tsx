import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FeeTemplate } from '@/hooks/useFeeTemplates';
import type { StudentFee } from '@/hooks/useFeesManagement';

/**
 * Collection progress for one fee template.
 *
 * Derives from the fees the page has ALREADY loaded rather than running its
 * own query. It used to fetch in a useEffect keyed on [template.id], and since
 * assigning fees does not change the template id, the effect never re-ran:
 * the card sat at "$0 / $0 collected · 0 / 0 paid" while the Individual fees
 * list right below it — which reads the same refetched data — correctly showed
 * the new rows. Reported 2026-08-08, immediately after the assign flow started
 * working for the first time.
 *
 * Deriving also drops one network round-trip PER TEMPLATE on every mount.
 *
 * Safe because useFeesManagement.fetchStudentFees selects the tenant's fees
 * with no limit and no status filter, so `fees` is the complete set — a
 * paginated source would silently undercount here.
 */
export function FeeTemplateRollup({
  template,
  fees,
}: {
  template: FeeTemplate;
  fees: StudentFee[];
}) {
  const rollup = useMemo(() => {
    const rows = fees.filter(f => f.template_id === template.id);
    return {
      expected: rows.reduce((s, r) => s + Number(r.amount ?? 0), 0),
      collected: rows.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0),
      paid: rows.filter(r => r.status === 'paid').length,
      total: rows.length,
    };
  }, [fees, template.id]);

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
