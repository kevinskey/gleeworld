import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  DollarSign, 
  FileText, 
  Calendar, 
  User,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Budget {
  id: string;
  title: string;
  description: string;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: string;
  budget_type: string;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const BudgetManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_amount: '',
    budget_type: 'project',
    start_date: '',
    end_date: '',
    status: 'draft' as string
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: "Error",
        description: "Failed to load budgets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const budgetData = {
        title: formData.title,
        description: formData.description,
        total_amount: parseFloat(formData.total_amount),
        allocated_amount: parseFloat(formData.total_amount),
        budget_type: formData.budget_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: formData.status,
        created_by: user.id
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);

        if (error) throw error;
        toast({ title: "Success", description: "Budget updated successfully" });
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert([budgetData]);

        if (error) throw error;
        toast({ title: "Success", description: "Budget created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: "Error",
        description: "Failed to save budget",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      total_amount: '',
      budget_type: 'project',
      start_date: '',
      end_date: '',
      status: 'draft'
    });
    setEditingBudget(null);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      title: budget.title,
      description: budget.description,
      total_amount: budget.total_amount.toString(),
      budget_type: budget.budget_type,
      start_date: budget.start_date,
      end_date: budget.end_date || '',
      status: budget.status
    });
    setDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Budget approved" });
      fetchBudgets();
    } catch (error) {
      console.error('Error approving budget:', error);
      toast({
        title: "Error",
        description: "Failed to approve budget",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Budget rejected" });
      fetchBudgets();
    } catch (error) {
      console.error('Error rejecting budget:', error);
      toast({
        title: "Error",
        description: "Failed to reject budget",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'pending_approval': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-center">Loading budgets...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wide">Budget Manager</h2>
          <p className="text-muted-foreground">Create, manage, and approve organizational budgets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Edit Budget' : 'Create New Budget'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Fall Concert Budget"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    placeholder="5000.00"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Budget for fall concert including venue, catering, and promotional materials"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Type</label>
                  <Select value={formData.budget_type} onValueChange={(value) => setFormData(prev => ({ ...prev, budget_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date (optional)</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBudget ? 'Update' : 'Create'} Budget
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {budgets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Budgets Created</h3>
              <p className="text-muted-foreground mb-4">
                Start managing your organization's finances by creating your first budget.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => (
            <Card key={budget.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {budget.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <Badge variant={getStatusColor(budget.status)}>
                        {budget.status.replace('_', ' ')}
                      </Badge>
                      <span>${budget.total_amount.toLocaleString()}</span>
                      <span>{budget.budget_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {budget.status === 'pending_approval' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleApprove(budget.id)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReject(budget.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(budget)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {budget.description && (
                  <p className="text-sm text-muted-foreground">{budget.description}</p>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Allocated:</span>
                    <p className="text-lg font-semibold text-blue-600">
                      ${budget.allocated_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Spent:</span>
                    <p className="text-lg font-semibold text-red-600">
                      ${budget.spent_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Remaining:</span>
                    <p className="text-lg font-semibold text-green-600">
                      ${budget.remaining_amount?.toLocaleString() || (budget.allocated_amount - budget.spent_amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(budget.start_date).toLocaleDateString()}
                    {budget.end_date && ` - ${new Date(budget.end_date).toLocaleDateString()}`}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {new Date(budget.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};