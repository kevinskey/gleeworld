
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, Plus, Search, Filter, PenTool } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { EditBudgetDialog } from "@/components/admin/budget/EditBudgetDialog";
import { BudgetCard } from "@/components/admin/budget/BudgetCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROUTES } from "@/constants/routes";

export const BudgetTracking = () => {
  const navigate = useNavigate();
  const { budgets, loading, deleteBudget, updateBudget, refetch } = useBudgets();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const handleEditBudget = (budget: any) => {
    setSelectedBudget(budget);
    setShowEditDialog(true);
  };

  const handleViewDetails = (budget: any) => {
    setSelectedBudget(budget);
    setShowDetailsDialog(true);
  };

  const handleUpdateBudget = async (budgetData: any) => {
    if (selectedBudget) {
      await updateBudget(selectedBudget.id, budgetData);
      setShowEditDialog(false);
      setSelectedBudget(null);
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
            <Button 
              onClick={() => navigate(ROUTES.CONTENT_CREATOR)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Plan New Budget
            </Button>
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
                  onEdit={handleEditBudget}
                  onDelete={handleDeleteBudget}
                  onViewDetails={handleViewDetails}
                  onUpdate={updateBudget}
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
                <Button 
                  onClick={() => navigate(ROUTES.CONTENT_CREATOR)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Plan Your First Budget
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedBudget?.title} - Budget Details
            </DialogTitle>
          </DialogHeader>
          {selectedBudget && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900">Budget Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{selectedBudget.budget_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium capitalize">{selectedBudget.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">{new Date(selectedBudget.start_date).toLocaleDateString()}</span>
                    </div>
                    {selectedBudget.end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-medium">{new Date(selectedBudget.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{new Date(selectedBudget.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900">Financial Summary</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Budget:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(selectedBudget.total_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Allocated:</span>
                      <span className="font-medium">{formatCurrency(selectedBudget.allocated_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spent:</span>
                      <span className="font-medium text-red-600">{formatCurrency(selectedBudget.spent_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency((selectedBudget.total_amount || 0) - (selectedBudget.spent_amount || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Utilization:</span>
                      <span className="font-semibold">
                        {selectedBudget.total_amount > 0 
                          ? ((selectedBudget.spent_amount || 0) / selectedBudget.total_amount * 100).toFixed(1) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedBudget.description && (
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900">Description</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-700">{selectedBudget.description}</p>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedBudget.contract_id && (
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900">Associated Contract</h4>
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-sm text-blue-700">Contract ID: {selectedBudget.contract_id}</p>
                    </div>
                  </div>
                )}
                {selectedBudget.event_id && (
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900">Associated Event</h4>
                    <div className="bg-purple-50 p-4 rounded-md">
                      <p className="text-sm text-purple-700">Event ID: {selectedBudget.event_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Budget Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        {selectedBudget && (
          <EditBudgetDialog 
            budget={selectedBudget}
            onSuccess={() => {
              setShowEditDialog(false);
              setSelectedBudget(null);
              refetch();
            }}
          />
        )}
      </Dialog>
    </div>
  );
};
