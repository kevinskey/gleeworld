import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  MoreHorizontal, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle
} from "lucide-react";
import { Budget } from "@/hooks/useBudgets";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface BudgetCardProps {
  budget: Budget;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budget: Budget) => void;
  onViewDetails?: (budget: Budget) => void;
}

export const BudgetCard = ({ budget, onEdit, onDelete, onViewDetails }: BudgetCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'on_hold': return 'outline';
      default: return 'default';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'project': return 'default';
      case 'event': return 'secondary';
      case 'contract': return 'outline';
      case 'annual': return 'destructive';
      default: return 'default';
    }
  };

  const spentPercentage = budget.total_amount > 0 ? (budget.spent_amount / budget.total_amount) * 100 : 0;
  const isOverBudget = budget.spent_amount > budget.total_amount;
  const isNearingLimit = spentPercentage > 80 && !isOverBudget;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{budget.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {budget.description || 'No description provided'}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusBadgeVariant(budget.status)}>
              {budget.status.replace('_', ' ')}
            </Badge>
            <Badge variant={getTypeBadgeVariant(budget.budget_type)}>
              {budget.budget_type}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(budget)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(budget)}>
                  Edit Budget
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
            <p className="font-medium text-green-900">{formatCurrency(budget.remaining_amount)}</p>
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
                isOverBudget ? 'text-red-600' : 
                isNearingLimit ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {spentPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <Progress 
            value={Math.min(spentPercentage, 100)} 
            className={`h-2 ${
              isOverBudget ? 'progress-destructive' : 
              isNearingLimit ? 'progress-warning' : ''
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

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onViewDetails?.(budget)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};