import React from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BudgetTracking } from "@/components/admin/financial/BudgetTracking";

export default function Budgets() {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Budget Management</h1>
            <p className="text-muted-foreground text-lg">
              Create, track, and manage budgets for events and projects
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="px-3 py-1 bg-primary/10 rounded-full">Financial Planning</span>
            </div>
          </div>
        </div>
        <BudgetTracking />
      </div>
    </UniversalLayout>
  );
}