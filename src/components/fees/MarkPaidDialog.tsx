import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeesManagement } from '@/hooks/useFeesManagement';

type PaymentMethod = 'cash' | 'check' | 'venmo' | 'other';

export function MarkPaidDialog({
  open,
  onClose,
  feeId,
  remainingAmount,
  bulkFees,
}: {
  open: boolean;
  onClose: () => void;
  feeId?: string;
  remainingAmount?: number;
  /** Bulk mode: record each fee's full remaining balance in one pass. */
  bulkFees?: { id: string; remaining: number }[];
}) {
  const { recordPayment } = useFeesManagement();
  const [amount, setAmount] = useState(remainingAmount ?? 0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const isBulk = !!bulkFees?.length;

  const submit = async () => {
    setBusy(true);
    try {
      if (isBulk) {
        for (const f of bulkFees!) {
          await recordPayment(f.id, method, f.remaining, ref || undefined);
        }
      } else if (feeId) {
        await recordPayment(feeId, method, amount, ref || undefined);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            value={method}
            onValueChange={v => setMethod(v as PaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="venmo">Venmo</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {isBulk ? (
            <p className="text-sm text-muted-foreground">
              Records the full remaining balance on each of the{' '}
              {bulkFees!.length} selected fees.
            </p>
          ) : (
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          )}
          <Input
            placeholder="Reference (check #, Venmo handle, etc.)"
            value={ref}
            onChange={e => setRef(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || (!isBulk && amount <= 0)}>
            {busy
              ? 'Recording…'
              : isBulk
                ? `Record ${bulkFees!.length} payments`
                : 'Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
