import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface BudgetSummaryCardProps {
  eventBudget: any;
}

export const BudgetSummaryCard = ({ eventBudget }: BudgetSummaryCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getNetColor = (amount: number) => {
    if (amount > 0) return "text-green-600";
    if (amount < 0) return "text-red-600";
    return "text-gray-600";
  };

  if (!eventBudget) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Auto-Calculated Summary
        </CardTitle>
        <CardDescription>Real-time budget calculations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Total Expenses</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(eventBudget.total_expenses)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Total Income</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(eventBudget.total_income)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Net Total</span>
            </div>
            <div className={`text-2xl font-bold ${getNetColor(eventBudget.net_total)}`}>
              {formatCurrency(eventBudget.net_total)}
            </div>
            <Badge variant={eventBudget.net_total >= 0 ? "default" : "destructive"} className="mt-2">
              {eventBudget.net_total >= 0 ? "Within Budget" : "Over Budget"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};