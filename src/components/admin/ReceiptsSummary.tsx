
import { DollarSign, FileText, Calendar, TrendingUp } from "lucide-react";

interface Receipt {
  id: string;
  amount: number;
  purchase_date: string;
  category: string;
  template_id?: string;
  event_id?: string;
}

interface ReceiptsSummaryProps {
  receipts: Receipt[];
  loading: boolean;
}

export const ReceiptsSummary = ({ receipts, loading }: ReceiptsSummaryProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalCount = receipts.length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthReceipts = receipts.filter(receipt => {
    const receiptDate = new Date(receipt.purchase_date);
    return receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear;
  });
  const thisMonthAmount = thisMonthReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  const associatedCount = receipts.filter(receipt => receipt.template_id || receipt.event_id).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Total Amount</h3>
          <DollarSign className="h-4 w-4 text-spelman-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(totalAmount)}</div>
        <p className="text-xs text-white/60">
          Across all receipts
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Total Receipts</h3>
          <FileText className="h-4 w-4 text-spelman-400" />
        </div>
        <div className="text-2xl font-bold text-white">{totalCount}</div>
        <p className="text-xs text-white/60">
          {associatedCount} associated with templates/events
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">This Month</h3>
          <Calendar className="h-4 w-4 text-spelman-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(thisMonthAmount)}</div>
        <p className="text-xs text-white/60">
          {thisMonthReceipts.length} receipts
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Average Amount</h3>
          <TrendingUp className="h-4 w-4 text-spelman-400" />
        </div>
        <div className="text-2xl font-bold text-white">
          {totalCount > 0 ? formatCurrency(totalAmount / totalCount) : '$0.00'}
        </div>
        <p className="text-xs text-white/60">
          Per receipt
        </p>
      </div>
    </div>
  );
};
