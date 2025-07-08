import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MoreHorizontal, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  Edit3,
  Save,
  X
} from "lucide-react";
import { Budget } from "@/hooks/useBudgets";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface BudgetCardProps {
  budget: Budget;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budget: Budget) => void;
  onViewDetails?: (budget: Budget) => void;
  onUpdate?: (id: string, updates: Partial<Budget>) => void;
}

export const BudgetCard = ({ budget, onEdit, onDelete, onViewDetails, onUpdate }: BudgetCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: budget.title,
    description: budget.description || "",
    total_amount: budget.total_amount.toString(),
    allocated_amount: budget.allocated_amount.toString(),
    budget_type: budget.budget_type,
    status: budget.status,
    start_date: budget.start_date,
    end_date: budget.end_date || ""
  });
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      case "on_hold": return "outline";
      default: return "default";
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "project": return "default";
      case "event": return "secondary";
      case "contract": return "outline";
      case "annual": return "destructive";
      default: return "default";
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(budget.id, {
        title: editData.title,
        description: editData.description || undefined,
        total_amount: parseFloat(editData.total_amount),
        allocated_amount: parseFloat(editData.allocated_amount),
        budget_type: editData.budget_type as Budget["budget_type"],
        status: editData.status as Budget["status"],
        start_date: editData.start_date,
        end_date: editData.end_date || undefined
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: budget.title,
      description: budget.description || "",
      total_amount: budget.total_amount.toString(),
      allocated_amount: budget.allocated_amount.toString(),
      budget_type: budget.budget_type,
      status: budget.status,
      start_date: budget.start_date,
      end_date: budget.end_date || ""
    });
    setIsEditing(false);
  };

  const spentPercentage = budget.total_amount > 0 ? (budget.spent_amount / budget.total_amount) * 100 : 0;
  const isOverBudget = budget.spent_amount > budget.total_amount;
  const isNearingLimit = spentPercentage > 80 && !isOverBudget;
  const remainingAmount = (budget.total_amount || 0) - (budget.spent_amount || 0);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <CardTitle className="text-lg truncate">{budget.title}</CardTitle>
                )}
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusBadgeVariant(budget.status)} className="text-xs">
                    {budget.status.replace("_", " ")}
                  </Badge>
                  <Badge variant={getTypeBadgeVariant(budget.budget_type)} className="text-xs">
                    {budget.budget_type}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatCurrency(budget.total_amount)}</div>
                  <div className="text-muted-foreground">Total Budget</div>
                </div>
                
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails?.(budget)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(budget)}>
                      Edit in Modal
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(budget)}
                      className="text-red-600"
                    >
                      Delete Budget
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CardContent className="space-y-4">
          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <DollarSign className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <p className="font-medium text-blue-900">{formatCurrency(budget.total_amount)}</p>
              <p className="text-blue-600">Total</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <TrendingDown className="h-4 w-4 mx-auto text-red-600 mb-1" />
              <p className="font-medium text-red-900">{formatCurrency(budget.spent_amount)}</p>
              <p className="text-red-600">Spent</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <p className="font-medium text-green-900">{formatCurrency(remainingAmount)}</p>
              <p className="text-green-600">Remaining</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Budget Utilization</span>
              <div className="flex items-center space-x-1">
                {isOverBudget && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {isNearingLimit && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                <span className={`font-medium ${
                  isOverBudget ? "text-red-600" : 
                  isNearingLimit ? "text-yellow-600" : 
                  "text-gray-600"
                }`}>
                  {spentPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress 
              value={Math.min(spentPercentage, 100)} 
              className={`h-2 ${
                isOverBudget ? "progress-destructive" : 
                isNearingLimit ? "progress-warning" : ""
              }`}
            />
            {isOverBudget && (
              <p className="text-xs text-red-600 flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Over budget by {formatCurrency(budget.spent_amount - budget.total_amount)}</span>
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(budget.start_date).toLocaleDateString()}
              {budget.end_date && ` - ${new Date(budget.end_date).toLocaleDateString()}`}
            </span>
          </div>

          {/* Expandable Details */}
          <CollapsibleContent className="space-y-4">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Budget Details</h4>
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancel}
                      className="flex items-center space-x-1"
                    >
                      <X className="h-3 w-3" />
                      <span>Cancel</span>
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleSave}
                      className="flex items-center space-x-1"
                    >
                      <Save className="h-3 w-3" />
                      <span>Save</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.total_amount}
                        onChange={(e) => setEditData(prev => ({ ...prev, total_amount: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{formatCurrency(budget.total_amount)}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allocated Amount</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.allocated_amount}
                        onChange={(e) => setEditData(prev => ({ ...prev, allocated_amount: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{formatCurrency(budget.allocated_amount)}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget Type</label>
                    {isEditing ? (
                      <Select
                        value={editData.budget_type}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, budget_type: value as Budget["budget_type"] }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium capitalize">{budget.budget_type}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    {isEditing ? (
                      <Select
                        value={editData.status}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as Budget["status"] }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium capitalize">{budget.status.replace("_", " ")}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.start_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{new Date(budget.start_date).toLocaleDateString()}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.end_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {budget.end_date ? new Date(budget.end_date).toLocaleDateString() : "No end date"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};