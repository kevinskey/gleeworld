import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BudgetApprovalDashboard } from "@/components/admin/budget/BudgetApprovalDashboard";

export default function BudgetApprovals() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto p-6 max-w-7xl bg-gradient-to-br from-brand-blue-light/5 to-brand-blue-dark/5 min-h-screen">
        <BudgetApprovalDashboard />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
}