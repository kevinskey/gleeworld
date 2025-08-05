import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { ModuleProps } from "@/types/modules";

export const BudgetsModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const budgets = [
    { id: 1, name: "Spring Concert 2024", allocated: 15000, spent: 8500, category: "Events", status: "active" },
    { id: 2, name: "Uniform & Wardrobe", allocated: 12000, spent: 11200, category: "Equipment", status: "warning" },
    { id: 3, name: "Tour Expenses", allocated: 25000, spent: 3200, category: "Travel", status: "active" },
    { id: 4, name: "Music & Licensing", allocated: 5000, spent: 4100, category: "Materials", status: "active" }
  ];

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Budget Management</h1>
            <p className="text-muted-foreground">Plan, track, and manage organizational budgets</p>
          </div>
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            New Budget
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${totalAllocated.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Allocated</div>
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
                  <div className="text-2xl font-bold">{Math.round((totalSpent/totalAllocated) * 100)}%</div>
                  <div className="text-sm text-muted-foreground">Utilization</div>
                </div>
                <PieChart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Calculator className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{budget.name}</div>
                      <div className="text-sm text-muted-foreground">{budget.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">${budget.spent.toLocaleString()} / ${budget.allocated.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((budget.spent/budget.allocated) * 100)}% used
                      </div>
                    </div>
                    <Badge variant={budget.status === 'warning' ? 'destructive' : 'default'}>
                      {budget.status}
                    </Badge>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
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
        <div className="space-y-2">
          <div className="text-sm">${totalAllocated.toLocaleString()} total allocated</div>
          <div className="text-sm">{Math.round((totalSpent/totalAllocated) * 100)}% utilization rate</div>
          <div className="text-sm">{budgets.length} active budgets</div>
        </div>
      </CardContent>
    </Card>
  );
};