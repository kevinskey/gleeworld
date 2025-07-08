import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";

interface CreateBudgetDialogProps {
  contractId?: string;
  eventId?: string;
  onSuccess?: () => void;
}

export const CreateBudgetDialog = ({ contractId, eventId, onSuccess }: CreateBudgetDialogProps) => {
  const { createBudget } = useBudgets();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_amount: '',
    allocated_amount: '',
    budget_type: contractId ? 'contract' : eventId ? 'event' : 'project',
    start_date: '',
    end_date: ''
  });

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
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        contract_id: contractId || undefined,
        event_id: eventId || undefined,
        status: 'active' as const,
        created_by: '' // This will be set in the hook
      };

      const result = await createBudget(budgetData);
      if (result) {
        setOpen(false);
        setFormData({
          title: '',
          description: '',
          total_amount: '',
          allocated_amount: '',
          budget_type: contractId ? 'contract' : eventId ? 'event' : 'project',
          start_date: '',
          end_date: ''
        });
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>
            Create a new budget to track expenses and allocations.
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
              <Label htmlFor="allocated_amount">Initial Allocation</Label>
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

          <div className="space-y-2">
            <Label htmlFor="budget_type">Budget Type</Label>
            <Select
              value={formData.budget_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, budget_type: value }))}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Creating..." : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};