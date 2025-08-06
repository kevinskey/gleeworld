import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, DollarSign, PieChart, Plus } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { useBudgets } from "@/hooks/useBudgets";
import { BudgetCreator } from "@/components/budget/BudgetCreator";
import { useState } from "react";

export const BudgetsModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { budgets, loading } = useBudgets();
  const [showBudgetCreator, setShowBudgetCreator] = useState(false);

  const totalAllocated = budgets.reduce((sum, b) => sum + b.total_amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount, 0);

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Budget Management</h1>
            <p className="text-muted-foreground">Create and manage organizational budgets</p>
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
              // Refresh will happen automatically via the hook
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${totalAllocated.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Budgeted</div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${(totalAllocated - totalSpent).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{totalAllocated > 0 ? Math.round((totalSpent/totalAllocated) * 100) : 0}%</div>
                  <div className="text-sm text-muted-foreground">Utilization</div>
                </div>
                <PieChart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No budgets created yet</p>
                <Button onClick={() => setShowBudgetCreator(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Budget
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calculator className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{budget.title}</div>
                        <div className="text-sm text-muted-foreground">{budget.budget_type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${budget.spent_amount.toLocaleString()} / ${budget.total_amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {budget.total_amount > 0 ? Math.round((Number(budget.spent_amount) / Number(budget.total_amount)) * 100) : 0}% used
                        </div>
                      </div>
                      <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
                        {budget.status}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => onNavigate?.(`/budgets/${budget.id}`)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Budget Management
        </CardTitle>
        <CardDescription>Financial planning and budget tracking</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="animate-pulse h-3 bg-muted rounded w-3/4"></div>
            <div className="animate-pulse h-3 bg-muted rounded w-1/2"></div>
            <div className="animate-pulse h-3 bg-muted rounded w-2/3"></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">${totalAllocated.toLocaleString()} total budgeted</div>
            <div className="text-sm">{totalAllocated > 0 ? Math.round((totalSpent/totalAllocated) * 100) : 0}% utilization rate</div>
            <div className="text-sm">{budgets.length} budgets</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};