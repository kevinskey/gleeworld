import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, FileText } from "lucide-react";
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StipendPeriodsPanel } from '@/features/stipends/components/StipendPeriodsPanel';

// Spreadsheet-style finance dashboard over the tenant's REAL money data:
// gw_student_fees (dues/wardrobe/trip fees) + gw_running_ledger (treasurer
// ledger). This page shipped for months with hardcoded demo numbers and
// dead buttons — every figure below now comes from the database, and the
// actions land in the tools where transactions actually live.

const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents);

interface FeeRow { amount: number; status: string | null; paid_at: string | null; paid_date: string | null; name: string | null; category: string | null; due_date: string | null; }

function useFinanceStats() {
  return useQuery({
    queryKey: ['admin-finance-stats'],
    queryFn: async () => {
      const [feesRes, ledgerRes] = await Promise.all([
        supabase.from('gw_student_fees').select('amount, status, paid_at, paid_date, name, category, due_date'),
        supabase.from('gw_running_ledger').select('running_balance, entry_date').order('entry_date', { ascending: false }).limit(1),
      ]);
      const fees = (feesRes.data ?? []) as FeeRow[];
      const isPaid = (f: FeeRow) => f.status === 'paid' || !!f.paid_at || !!f.paid_date;
      const collected = fees.filter(isPaid).reduce((s, f) => s + Number(f.amount || 0), 0);
      const pending = fees.filter((f) => !isPaid(f));
      const pendingTotal = pending.reduce((s, f) => s + Number(f.amount || 0), 0);
      const ledger = ledgerRes.data?.[0] ?? null;
      return {
        collected,
        paidCount: fees.length - pending.length,
        pendingTotal,
        pendingCount: pending.length,
        ledgerBalance: ledger ? Number((ledger as any).running_balance) : null,
        fees,
      };
    },
    staleTime: 60 * 1000,
  });
}

const FinancialManagement = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useFinanceStats();

  const generateSummary = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [feesRes, ledgerRes] = await Promise.all([
      supabase.from('gw_student_fees').select('name, category, amount, status, paid_at, due_date').gte('created_at', monthStart),
      supabase.from('gw_running_ledger').select('entry_date, description, transaction_type, amount, running_balance').gte('entry_date', monthStart.slice(0, 10)).order('entry_date'),
    ]);
    const feeRows = feesRes.data ?? [];
    const ledgerRows = ledgerRes.data ?? [];
    if (feeRows.length === 0 && ledgerRows.length === 0) {
      toast({ title: 'Nothing to report', description: 'No fees or ledger entries recorded this month.' });
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      'Section,Date,Name,Category/Type,Amount,Status/Balance',
      ...feeRows.map((f) => ['Fee', f.due_date, f.name, f.category, f.amount, f.status].map(esc).join(',')),
      ...ledgerRows.map((l) => ['Ledger', l.entry_date, l.description, l.transaction_type, l.amount, l.running_balance].map(esc).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financial-summary-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const statRows: Array<{ Icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta: string; tone?: 'positive' | 'neutral' | 'warning'; }> = [
    {
      Icon: DollarSign, label: 'Fees Collected',
      value: isLoading ? '…' : money(data?.collected ?? 0),
      delta: isLoading ? '' : data?.paidCount ? `${data.paidCount} paid fees` : 'No fees recorded yet',
      tone: 'positive',
    },
    {
      Icon: CreditCard, label: 'Outstanding Fees',
      value: isLoading ? '…' : money(data?.pendingTotal ?? 0),
      delta: isLoading ? '' : data?.pendingCount ? `${data.pendingCount} unpaid` : 'Nothing outstanding',
      tone: 'neutral',
    },
    {
      Icon: TrendingUp, label: 'Ledger Balance',
      value: isLoading ? '…' : data?.ledgerBalance !== null && data?.ledgerBalance !== undefined ? money(data.ledgerBalance) : '—',
      delta: isLoading ? '' : data?.ledgerBalance !== null && data?.ledgerBalance !== undefined ? 'Running ledger' : 'No ledger entries yet',
      tone: 'warning',
    },
  ];

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <DashboardPageShell
      title="Financial Management"
      subtitle="Payments, stipends, dues, and budgets."
      actions={
        <Button onClick={() => nav('/dashboard/fees')}>
          <DollarSign className="mr-1.5 h-5 w-5" />
          Manage Fees
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
            {statRows.map(({ Icon, label, value, delta, tone }) => (
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

      {/* Stipends. This page is what /dashboard/finance actually renders, so
          the stipend tools live here — not only in FinanceHub, which is a
          different (modular-dashboard) surface. */}
      <StipendPeriodsPanel />

      {/* Reports row, also as a compact spreadsheet-style strip */}
      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Reports
        </div>
        <div className="px-3 py-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>Monthly financial summary (CSV)</span>
          </div>
          <Button variant="outline" size="sm" onClick={generateSummary}>Generate</Button>
        </div>
      </div>

    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default FinancialManagement;
