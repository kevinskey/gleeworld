import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calculator } from "lucide-react";
import { BudgetCreator } from "@/components/budget/BudgetCreator";
import { BudgetsList } from "@/components/budget/BudgetsList";
import { useState } from "react";

export const BudgetApprovalDashboard = () => {
  const [showBudgetCreator, setShowBudgetCreator] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Management</h2>
          <p className="text-muted-foreground">
            Create and manage organizational budgets
          </p>
        </div>
        <Button onClick={() => setShowBudgetCreator(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {showBudgetCreator && (
        <BudgetCreator 
          onClose={() => setShowBudgetCreator(false)}
          onSuccess={() => {
            setShowBudgetCreator(false);
          }}
        />
      )}

      <BudgetsList />
    </div>
  );
};