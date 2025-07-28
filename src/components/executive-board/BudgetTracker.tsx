import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Budget {
  id: string;
  title: string;
  total_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: string;
}

export const BudgetTracker = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  const fetchBudgets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('created_by', user.id)
        .eq('status', 'active')
        .limit(3);

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Budget & Expense Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground">Loading budgets...</div>
        ) : budgets.length > 0 ? (
          budgets.map((budget) => (
            <div key={budget.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{budget.title}</h4>
                <Badge variant={budget.remaining_amount > 0 ? "default" : "destructive"}>
                  ${budget.remaining_amount.toFixed(2)} left
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                ${budget.spent_amount.toFixed(2)} / ${budget.total_amount.toFixed(2)} spent
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((budget.spent_amount / budget.total_amount) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground text-center py-4">
            No active budgets found
          </div>
        )}

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                New Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Budget Proposal</DialogTitle>
              </DialogHeader>
              <div className="text-muted-foreground">
                Budget creation form coming soon...
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Receipt className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Expense</DialogTitle>
              </DialogHeader>
              <div className="text-muted-foreground">
                Expense submission form coming soon...
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};