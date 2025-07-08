
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, Plus, Search, Filter } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { CreateBudgetDialog } from "@/components/admin/budget/CreateBudgetDialog";
import { BudgetCard } from "@/components/admin/budget/BudgetCard";

export const BudgetTracking = () => {
  const { budgets, loading, deleteBudget, refetch } = useBudgets();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = budget.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         budget.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || budget.status === statusFilter;
    const matchesType = typeFilter === "all" || budget.budget_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalBudgetAmount = budgets.reduce((sum, budget) => sum + budget.total_amount, 0);
  const totalSpentAmount = budgets.reduce((sum, budget) => sum + budget.spent_amount, 0);
  const totalRemainingAmount = budgets.reduce((sum, budget) => sum + budget.remaining_amount, 0);
  const activeBudgets = budgets.filter(b => b.status === 'active').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleDeleteBudget = async (budget: any) => {
    if (confirm(`Are you sure you want to delete "${budget.title}"? This action cannot be undone.`)) {
      await deleteBudget(budget.id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgetAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {activeBudgets} active budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpentAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgetAmount > 0 ? ((totalSpentAmount / totalBudgetAmount) * 100).toFixed(1) : 0}% of total budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRemainingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Available across all budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgets.filter(b => b.spent_amount > b.total_amount * 0.8).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Budgets over 80% spent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budget Management</CardTitle>
              <CardDescription>Create, manage, and track project budgets</CardDescription>
            </div>
            <CreateBudgetDialog onSuccess={refetch} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Budget Grid */}
          {filteredBudgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onDelete={handleDeleteBudget}
                  onViewDetails={(budget) => console.log('View details:', budget)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                  ? "No budgets match your filters" 
                  : "No budgets created yet"
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your search terms or filters"
                  : "Create your first budget to start tracking expenses and allocations"
                }
              </p>
              {(!searchTerm && statusFilter === "all" && typeFilter === "all") && (
                <CreateBudgetDialog onSuccess={refetch} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
