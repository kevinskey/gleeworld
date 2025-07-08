import { useState, useEffect } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgets } from "@/hooks/useBudgets";
import type { Budget } from "@/hooks/useBudgets";

interface EditBudgetDialogProps {
  budget: Budget;
  onSuccess?: () => void;
}

export const EditBudgetDialog = ({ budget, onSuccess }: EditBudgetDialogProps) => {
  const { updateBudget } = useBudgets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: budget.title,
    description: budget.description || '',
    total_amount: budget.total_amount.toString(),
    allocated_amount: budget.allocated_amount.toString(),
    budget_type: budget.budget_type,
    status: budget.status,
    start_date: budget.start_date,
    end_date: budget.end_date || ''
  });

  useEffect(() => {
    setFormData({
      title: budget.title,
      description: budget.description || '',
      total_amount: budget.total_amount.toString(),
      allocated_amount: budget.allocated_amount.toString(),
      budget_type: budget.budget_type,
      status: budget.status,
      start_date: budget.start_date,
      end_date: budget.end_date || ''
    });
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budgetData = {
        title: formData.title,
        description: formData.description || undefined,
        total_amount: parseFloat(formData.total_amount),
        allocated_amount: parseFloat(formData.allocated_amount),
        budget_type: formData.budget_type as 'project' | 'event' | 'contract' | 'annual',
        status: formData.status as 'active' | 'completed' | 'cancelled' | 'on_hold',
        start_date: formData.start_date,
        end_date: formData.end_date || undefined
      };

      const result = await updateBudget(budget.id, budgetData);
      if (result) {
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Budget</DialogTitle>
        <DialogDescription>
          Update budget information and settings.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter budget title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="total_amount">Total Amount *</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocated_amount">Allocated Amount</Label>
            <Input
              id="allocated_amount"
              type="number"
              step="0.01"
              value={formData.allocated_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, allocated_amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budget_type">Budget Type</Label>
            <Select
              value={formData.budget_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, budget_type: value as 'project' | 'event' | 'contract' | 'annual' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'completed' | 'cancelled' | 'on_hold' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Updating..." : "Update Budget"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};