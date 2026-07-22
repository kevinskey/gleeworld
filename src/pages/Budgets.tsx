import React from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BudgetTracking } from "@/components/admin/financial/BudgetTracking";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

export default function Budgets() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
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
    </DashboardShell>
    </UniversalLayout>
  );
}