import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useMyFees } from '@/hooks/useMyFees';

export function YouOweCard() {
  const { totalOwed, unpaid, loading } = useMyFees();
  if (loading || totalOwed <= 0) return null;
  const count = unpaid.length;
  return (
    <Link to="/dashboard/my-fees">
      <Card className="p-4 flex items-center gap-3 bg-primary/5 hover:bg-primary/10 transition border-primary/20">
        <CreditCard className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">You owe</div>
          <div className="font-semibold">
            ${totalOwed.toFixed(2)}{' '}
            <span className="font-normal text-sm text-muted-foreground">
              across {count} item{count === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <span className="text-primary text-sm font-medium shrink-0">Pay now →</span>
      </Card>
    </Link>
  );
}
