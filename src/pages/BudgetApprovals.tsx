import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BudgetApprovalDashboard } from "@/components/admin/budget/BudgetApprovalDashboard";

export default function BudgetApprovals() {
  return (
    <UniversalLayout>
      <div className="container mx-auto p-6 max-w-7xl bg-gradient-to-br from-spelman-blue-light/5 to-spelman-blue-dark/5 min-h-screen">
        <BudgetApprovalDashboard />
      </div>
    </UniversalLayout>
  );
}