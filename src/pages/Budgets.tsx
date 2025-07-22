import React from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BudgetTracking } from "@/components/admin/financial/BudgetTracking";

export default function Budgets() {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Budget Management</h1>
          <p className="text-muted-foreground">
            Create, track, and manage budgets for events and projects
          </p>
        </div>
        <BudgetTracking />
      </div>
    </UniversalLayout>
  );
}