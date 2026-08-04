import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayFeeButton } from './PayFeeButton';
import type { MyFee } from '@/hooks/useMyFees';

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
}

export function StudentFeeCard({ fee, canPay }: StudentFeeCardProps) {
  const remaining = Number(fee.amount) - Number(fee.paid_amount);
  const isPaid = !PAYABLE_STATUSES.has(fee.status);

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
        <div className="border-t pt-2 mt-1 space-y-1">
          {fee.plan.installments.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                #{inst.installment_number} · {new Date(inst.due_date).toLocaleDateString()}
              </span>
              <span>
                ${Number(inst.amount).toFixed(2)} · {inst.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isPaid && canPay && (
        <div className="pt-1">
          <PayFeeButton studentFeeId={fee.id} />
        </div>
      )}
    </Card>
  );
}
