import React from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BudgetTracking } from "@/components/admin/financial/BudgetTracking";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

export default function Budgets() {
  return (
    <UniversalLayout>
      <DashboardPageShell
        title="Budget Management"
        subtitle="Create, track, and manage budgets for events and projects"
        maxWidth="7xl"
        actions={
          <span className="px-3 py-1 bg-primary/10 rounded-full text-sm text-muted-foreground">
            Financial Planning
          </span>
        }
      >
        <BudgetTracking />
      </DashboardPageShell>
    </UniversalLayout>
  );
}