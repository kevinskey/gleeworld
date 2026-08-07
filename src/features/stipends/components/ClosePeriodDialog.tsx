import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CoverageRow, StandingRow } from '../useStipendStanding';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

interface Props {
  periodName: string;
  rows: StandingRow[];
  coverage?: CoverageRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

/**
 * Closing freezes earned amounts into final_amount, so an unmarked service —
 * a student with no attendance row for a service where roll was taken — gets
 * frozen in as an absence. QR check-in only ever writes 'present' rows, so
 * unmarked genuinely means absent most of the time; but a failed scan looks
 * identical. This dialog makes those students impossible to miss without
 * blocking a close that is legitimately correct.
 *
 * It also warns on the harder case: a service where roll was never taken at
 * all. That one scores for nobody and does not show up in unmarked_count,
 * because there is no attendance row anywhere to compare against. If the
 * covered calendar has fewer services than required_services, even perfect
 * attendance cannot earn a full stipend — so that shortfall is called out in
 * dollars before anything is frozen.
 */
export function ClosePeriodDialog({
  periodName, rows, coverage, open, onOpenChange, onConfirm,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unmarked = rows
    .filter((r) => Number(r.unmarked_count) > 0)
    .sort((a, b) => Number(b.unmarked_count) - Number(a.unmarked_count));

  const uncovered = Number(coverage?.uncovered_units ?? 0);
  const shortfall = Number(coverage?.shortfall_units ?? 0);

  // What a full-attendance scholar loses per head to the shortfall, so the
  // warning lands in dollars rather than in units.
  const perService = rows.length ? Number(rows[0].per_service_value ?? 0) : 0;
  const shortfallCost = shortfall * perService;

  const needsAck = unmarked.length > 0 || uncovered > 0;

  // Never carry a previous acknowledgement into a fresh close.
  useEffect(() => {
    if (open) { setAcknowledged(false); setError(null); }
  }, [open]);

  const confirm = async () => {
    setClosing(true); setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not close the period.');
    } finally { setClosing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close {periodName}?</DialogTitle>
          <DialogDescription className="text-xs">
            Earned amounts are frozen. Later attendance edits will no longer
            change them.
          </DialogDescription>
        </DialogHeader>

        {uncovered > 0 && (
          <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2">
            <p className="text-xs font-medium">
              Roll was never taken at {uncovered} service
              {uncovered === 1 ? '' : 's'} in this period.
            </p>
            <p className="text-xs text-muted-foreground">
              Those services earn credit for nobody and are not listed per
              student below.
              {shortfall > 0 && (
                <>
                  {' '}Only {coverage?.covered_units} of the{' '}
                  {coverage?.required_services} services needed for a full
                  stipend were recorded, so even perfect attendance now caps at{' '}
                  {money(Math.max(0, (rows[0]?.base_amount ?? 0) - shortfallCost))}
                  {' '}— {money(shortfallCost)} short per scholar.
                </>
              )}
            </p>
          </div>
        )}

        {unmarked.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              {unmarked.length} student{unmarked.length === 1 ? '' : 's'} ha
              {unmarked.length === 1 ? 's' : 've'} unmarked services:
            </p>
            <ScrollArea className="max-h-40 rounded-md border">
              <ul className="p-2 space-y-1">
                {unmarked.map((r) => (
                  <li key={r.award_id}
                    className="flex items-center justify-between gap-3 px-1 text-sm">
                    <span>{r.full_name ?? r.email ?? 'Unknown student'}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {r.unmarked_count} unmarked
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              These count as absences and will be frozen into final amounts.
            </p>
          </div>
        )}

        {needsAck && (
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <Checkbox
              aria-label="I've reviewed these"
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
            />
            <span className="text-sm">I've reviewed these</span>
          </label>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={confirm}
            disabled={closing || (needsAck && !acknowledged)}>
            {closing ? 'Closing…' : 'Close period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
