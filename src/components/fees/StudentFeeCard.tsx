import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PayFeeButton } from './PayFeeButton';
import type { MyFee, SplitCount } from '@/hooks/useMyFees';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  overdue: 'destructive',
  waived: 'outline',
  refunded: 'outline',
};

function badgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return STATUS_BADGE_VARIANT[status] ?? 'secondary';
}

const PAYABLE_STATUSES = new Set(['pending', 'partial', 'overdue']);

interface StudentFeeCardProps {
  fee: MyFee;
  canPay: boolean;
  /** Provided by MyFeesPage; enables the "Split into payments" control. */
  onSplit?: (feeId: string, count: SplitCount) => Promise<void>;
}

export function StudentFeeCard({ fee, canPay, onSplit }: StudentFeeCardProps) {
  const { toast } = useToast();
  const [splitting, setSplitting] = useState(false);
  const remaining = Number(fee.amount) - Number(fee.paid_amount);
  const isPaid = !PAYABLE_STATUSES.has(fee.status);

  const canSplit =
    !isPaid && remaining > 0 && fee.allow_self_serve_split && !fee.plan && !!onSplit;

  const split = async (count: SplitCount) => {
    setSplitting(true);
    try {
      await onSplit!(fee.id, count);
      toast({ title: `Split into ${count} monthly payments` });
    } catch (e) {
      toast({
        title: 'Could not set up installments',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSplitting(false);
    }
  };

  return (
    <Card className="p-4 flex flex-col gap-2 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {fee.category && (
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              {fee.category}
            </div>
          )}
          <div className="font-semibold truncate">{fee.name}</div>
          {fee.due_date && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Due {new Date(fee.due_date).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-semibold">${remaining.toFixed(2)}</div>
          {Number(fee.paid_amount) > 0 && (
            <div className="text-xs text-muted-foreground">
              ${Number(fee.paid_amount).toFixed(2)} paid
            </div>
          )}
          <Badge variant={badgeVariant(fee.status)} className="mt-1">
            {fee.status}
          </Badge>
        </div>
      </div>

      {fee.plan && fee.plan.installments.length > 0 && (
        <div className="border-t pt-2 mt-1 space-y-2">
          {fee.plan.installments.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                #{inst.installment_number} · {new Date(inst.due_date).toLocaleDateString()} ·{' '}
                ${Number(inst.amount).toFixed(2)}
              </span>
              {inst.status === 'paid' ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" /> paid
                </span>
              ) : (
                !isPaid &&
                canPay && (
                  <PayFeeButton
                    studentFeeId={fee.id}
                    installmentId={inst.id}
                    size="sm"
                    label={`Pay $${Number(inst.amount).toFixed(2)}`}
                  />
                )
              )}
            </div>
          ))}
        </div>
      )}

      {!isPaid && canPay && !fee.plan && (
        <div className="pt-1">
          <PayFeeButton studentFeeId={fee.id} />
        </div>
      )}

      {canSplit && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
          <span>Split into monthly payments:</span>
          {([2, 3, 4] as SplitCount[]).map(n => (
            <Button
              key={n}
              variant="outline"
              size="sm"
              disabled={splitting}
              onClick={() => split(n)}
            >
              {n}×
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
