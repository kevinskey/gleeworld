import React from 'react';
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, FileText } from "lucide-react";
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

// Spreadsheet-style finance dashboard. Stats sit in compact rows of a
// dense table — easier to scan when the numbers are what matter, and
// stops the per-card padding from chewing up the iPad viewport. Big
// dollar figures stay numeric but trimmed back to text-lg so the eye
// follows the column instead of being shouted at.

const STAT_ROWS: Array<{
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  tone?: 'positive' | 'neutral' | 'warning';
}> = [
  { Icon: DollarSign, label: 'Total Revenue',    value: '$12,450', delta: '+8% from last month', tone: 'positive' },
  { Icon: CreditCard, label: 'Pending Payments', value: '$2,340',  delta: '5 transactions',      tone: 'neutral' },
  { Icon: TrendingUp, label: 'Budget Status',    value: '85%',     delta: 'Budget utilized',     tone: 'warning' },
];

const FinancialManagement = () => {
  return (
    <UniversalLayout>
      <DashboardPageShell
      title="Financial Management"
      subtitle="Payments, stipends, dues, and budgets."
      actions={
        <Button>
          <DollarSign className="mr-1.5 h-5 w-5" />
          New Transaction
        </Button>
      }
    >
      {/* Stat table */}
      <div className="border border-border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Metric</th>
              <th className="text-right px-3 py-2 font-semibold tabular-nums">Value</th>
              <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {STAT_ROWS.map(({ Icon, label, value, delta, tone }) => (
              <tr key={label} className="hover:bg-accent/30 transition-colors">
                <td className="px-3 py-2">
                  <div className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                  </div>
                </td>
                <td className="text-right px-3 py-2 font-semibold tabular-nums text-lg">
                  {value}
                </td>
                <td className={`px-3 py-2 text-xs hidden sm:table-cell ${
                  tone === 'positive' ? 'text-emerald-700'
                    : tone === 'warning' ? 'text-amber-700'
                    : 'text-muted-foreground'
                }`}>
                  {delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reports row, also as a compact spreadsheet-style strip */}
      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Reports
        </div>
        <div className="px-3 py-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>Monthly financial summary</span>
          </div>
          <Button variant="outline" size="sm">Generate</Button>
        </div>
      </div>
    </DashboardPageShell>
    </UniversalLayout>
  );
};

export default FinancialManagement;
