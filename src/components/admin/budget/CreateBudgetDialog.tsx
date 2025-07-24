import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { UserAssociationSelector } from "@/components/budget/UserAssociationSelector";

interface CreateBudgetDialogProps {
  contractId?: string;
  eventId?: string;
  onSuccess?: () => void;
}

interface BudgetItem {
  id: string;
  description: string;
  estimatedCost: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

interface UserAssociation {
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  permission_type: 'view' | 'edit' | 'manage';
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
  
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [userAssociations, setUserAssociations] = useState<UserAssociation[]>([]);

  const addBudgetItem = () => {
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      description: '',
      estimatedCost: '',
      category: 'other',
      priority: 'medium'
    };
    setBudgetItems([...budgetItems, newItem]);
  };

  const removeBudgetItem = (id: string) => {
    setBudgetItems(budgetItems.filter(item => item.id !== id));
  };

  const updateBudgetItem = (id: string, field: keyof BudgetItem, value: string) => {
    setBudgetItems(budgetItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotalFromItems = () => {
    return budgetItems.reduce((total, item) => {
      const cost = parseFloat(item.estimatedCost) || 0;
      return total + cost;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budgetData = {
        title: formData.title,
        description: formData.description || undefined,
        total_amount: parseFloat(formData.total_amount),
        allocated_amount: formData.allocated_amount ? parseFloat(formData.allocated_amount) : 0,
        budget_type: formData.budget_type as 'project' | 'event' | 'contract' | 'annual',
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        contract_id: contractId || undefined,
        event_id: eventId || undefined,
        status: 'active' as const,
        created_by: '' // This will be set in the hook
      };

      const result = await createBudget(budgetData, userAssociations);
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
        setBudgetItems([]);
        setUserAssociations([]);
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
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Create New Budget</DialogTitle>
          <DialogDescription className="text-gray-600">
            Create a new budget to track expenses and allocations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Budget Details</TabsTrigger>
              <TabsTrigger value="items">Budget Items</TabsTrigger>
              <TabsTrigger value="users">User Access</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
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
                <Label htmlFor="description" className="text-black">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter a detailed description of this budget..."
                  rows={5}
                  className="bg-white text-black border-gray-300"
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
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Budget Items</Label>
                <Button type="button" onClick={addBudgetItem} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              {budgetItems.length > 0 && (
                <div className="space-y-3">
                  {budgetItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-4">
                        <Label htmlFor={`item-desc-${item.id}`} className="text-sm">Description</Label>
                        <Input
                          id={`item-desc-${item.id}`}
                          value={item.description}
                          onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-cost-${item.id}`} className="text-sm">Est. Cost</Label>
                        <Input
                          id={`item-cost-${item.id}`}
                          type="number"
                          step="0.01"
                          value={item.estimatedCost}
                          onChange={(e) => updateBudgetItem(item.id, 'estimatedCost', e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-category-${item.id}`} className="text-sm">Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(value) => updateBudgetItem(item.id, 'category', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="supplies">Supplies</SelectItem>
                            <SelectItem value="services">Services</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="catering">Catering</SelectItem>
                            <SelectItem value="venue">Venue</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-priority-${item.id}`} className="text-sm">Priority</Label>
                        <Select
                          value={item.priority}
                          onValueChange={(value) => updateBudgetItem(item.id, 'priority', value as 'high' | 'medium' | 'low')}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          onClick={() => removeBudgetItem(item.id)}
                          size="sm"
                          variant="outline"
                          className="w-full text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-semibold">Total Estimated Cost from Items:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${calculateTotalFromItems().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              {budgetItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No budget items added yet.</p>
                  <p className="text-sm">Click "Add Item" to start building your budget breakdown.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UserAssociationSelector
                associations={userAssociations}
                onAssociationsChange={setUserAssociations}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => {
              setOpen(false);
              setBudgetItems([]);
              setUserAssociations([]);
            }}>
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