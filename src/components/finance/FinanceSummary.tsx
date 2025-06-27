
import { DollarSign, TrendingUp, TrendingDown, Calculator, Wallet, CreditCard } from "lucide-react";
import type { FinanceRecord } from "./FinanceTable";

interface FinanceSummaryProps {
  records: FinanceRecord[];
  loading: boolean;
}

export const FinanceSummary = ({ records, loading }: FinanceSummaryProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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

  const totalStipends = records.filter(r => r.type === 'stipend').reduce((sum, r) => sum + r.amount, 0);
  const totalReceipts = records.filter(r => r.type === 'receipt').reduce((sum, r) => sum + r.amount, 0);
  const totalPayments = records.filter(r => r.type === 'payment').reduce((sum, r) => sum + r.amount, 0);
  const totalDebits = records.filter(r => r.type === 'debit').reduce((sum, r) => sum + r.amount, 0);
  const totalCredits = records.filter(r => r.type === 'credit').reduce((sum, r) => sum + r.amount, 0);
  
  const currentBalance = records.length > 0 ? records[records.length - 1].balance : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Stipends</h3>
          <Wallet className="h-4 w-4 text-green-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(totalStipends)}</div>
        <p className="text-xs text-white/60">
          {records.filter(r => r.type === 'stipend').length} records
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Receipts</h3>
          <DollarSign className="h-4 w-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(totalReceipts)}</div>
        <p className="text-xs text-white/60">
          {records.filter(r => r.type === 'receipt').length} records
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Payments</h3>
          <CreditCard className="h-4 w-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(totalPayments)}</div>
        <p className="text-xs text-white/60">
          {records.filter(r => r.type === 'payment').length} records
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Debits</h3>
          <TrendingDown className="h-4 w-4 text-red-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(totalDebits)}</div>
        <p className="text-xs text-white/60">
          {records.filter(r => r.type === 'debit').length} records
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Credits</h3>
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-white">{formatCurrency(totalCredits)}</div>
        <p className="text-xs text-white/60">
          {records.filter(r => r.type === 'credit').length} records
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Current Balance</h3>
          <Calculator className="h-4 w-4 text-yellow-400" />
        </div>
        <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(currentBalance)}
        </div>
        <p className="text-xs text-white/60">
          Running balance
        </p>
      </div>
    </div>
  );
};
