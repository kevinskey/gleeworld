import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStipendCoverage, useStipendStanding } from '../useStipendStanding';
import type { StipendPeriod } from '../useStipendPeriods';
import { EnrollStudentsDialog } from './EnrollStudentsDialog';
import { ClosePeriodDialog } from './ClosePeriodDialog';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const db = supabase as any;

interface Props {
  period: StipendPeriod;
  onClose: () => Promise<void>;
  onActivate: () => Promise<void>;
}

export function StipendRoster({ period, onClose, onActivate }: Props) {
  const { rows, loading, error, refetch } = useStipendStanding(period.id);
  const { coverage } = useStipendCoverage(period.id);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const totalEarned = rows.reduce((s, r) => s + Number(r.earned ?? 0), 0);
  const totalForfeited = rows.reduce((s, r) => s + Number(r.forfeited ?? 0), 0);
  const anyUnmarked = rows.some((r) => Number(r.unmarked_count) > 0);
  const anyUnmapped = rows.some((r) => Number(r.unmapped_count) > 0);
  const uncovered = Number(coverage?.uncovered_units ?? 0);
  const shortfall = Number(coverage?.shortfall_units ?? 0);

  const applyOverride = async (awardId: string) => {
    const raw = window.prompt('Override amount (dollars):');
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return;
    const reason = window.prompt('Reason for the override (required):');
    if (!reason || !reason.trim()) return;

    const { data, error: err } = await db
      .from('gw_stipend_awards')
      .update({ override_amount: amount, override_reason: reason.trim() })
      .eq('id', awardId).select();
    if (err || !data?.length) {
      window.alert(err?.message ?? 'Override was not saved — check your permissions.');
      return;
    }
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEnrollOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add students
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 auto-rows-max">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="!text-xs text-muted-foreground">Earned to date</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(totalEarned)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="!text-xs text-muted-foreground">Forfeited</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(totalForfeited)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="!text-xs text-muted-foreground">Students</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{rows.length}</CardContent>
        </Card>
      </div>

      {(anyUnmarked || anyUnmapped || uncovered > 0) && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            {uncovered > 0 && (
              <p>
                Roll was never taken at {uncovered} service
                {uncovered === 1 ? '' : 's'} in this period, so {uncovered === 1 ? 'it earns' : 'they earn'} credit for
                nobody and {uncovered === 1 ? 'does' : 'do'} not appear in any student's row below.
                {shortfall > 0 && (
                  <> Only {coverage?.covered_units} of the {coverage?.required_services}{' '}
                  services needed for a full stipend have been recorded, so even
                  perfect attendance cannot reach 100% until roll is taken or{' '}
                  <em>required services</em> is lowered.</>
                )}
              </p>
            )}
            {anyUnmarked && (
              <p>Some students have no attendance row for services where roll was taken. Those count as absences — check the roster before closing.</p>
            )}
            {anyUnmapped && (
              <p>Some attendance statuses are missing from the stipend policy and earn no credit. Add them to the policy weights.</p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading standing…</p>}

      {!loading && rows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No students in this period yet. Use "Add students" to enroll them.
        </CardContent></Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Student</TableHead>
                  <TableHead className="text-xs text-right">Credited</TableHead>
                  <TableHead className="text-xs text-right">Absences</TableHead>
                  <TableHead className="text-xs text-right">Earned</TableHead>
                  <TableHead className="text-xs text-right">Forfeited</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.award_id}>
                    <TableCell className="text-sm">
                      {r.full_name ?? r.email ?? 'Unknown student'}
                      {Number(r.unmarked_count) > 0 && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {r.unmarked_count} unmarked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {Number(r.credited_services)} / {r.required_services}
                    </TableCell>
                    <TableCell className="text-sm text-right">{r.absences}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{money(Number(r.earned))}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">{money(Number(r.forfeited))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-xs"
                        onClick={() => applyOverride(r.award_id)}>
                        Override
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {period.status === 'draft' && rows.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onActivate()}>
            Activate period
          </Button>
        </div>
      )}

      {period.status === 'active' && rows.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCloseOpen(true)}>
            Close period
          </Button>
        </div>
      )}

      <EnrollStudentsDialog period={period} open={enrollOpen}
        onOpenChange={setEnrollOpen} onEnrolled={refetch} />

      <ClosePeriodDialog periodName={period.name} rows={rows} coverage={coverage}
        open={closeOpen} onOpenChange={setCloseOpen} onConfirm={onClose} />
    </div>
  );
}
