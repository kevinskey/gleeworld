import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Plus, Edit2, Trash2, Bus, Hotel, Utensils, Music, Users, FileText, TrendingUp, TrendingDown, Calculator, CheckCircle, Clock, AlertCircle, Save, PieChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
interface BudgetCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  items: BudgetLineItem[];
}
interface BudgetLineItem {
  id: string;
  category: string;
  description: string;
  estimated_cost: number;
  actual_cost: number;
  quantity: number;
  unit_cost: number;
  notes?: string;
  status: 'planned' | 'confirmed' | 'paid';
}
interface TourBudgetSummary {
  total_estimated: number;
  total_actual: number;
  total_revenue: number;
  net_balance: number;
}
const BUDGET_CATEGORIES: BudgetCategory[] = [{
  id: 'transportation',
  name: 'Transportation',
  icon: Bus,
  color: 'bg-blue-500',
  items: []
}, {
  id: 'lodging',
  name: 'Lodging',
  icon: Hotel,
  color: 'bg-purple-500',
  items: []
}, {
  id: 'meals',
  name: 'Meals & Food',
  icon: Utensils,
  color: 'bg-orange-500',
  items: []
}, {
  id: 'stipends',
  name: 'Singer Stipends',
  icon: Users,
  color: 'bg-green-500',
  items: []
}, {
  id: 'performance',
  name: 'Performance Costs',
  icon: Music,
  color: 'bg-pink-500',
  items: []
}, {
  id: 'misc',
  name: 'Miscellaneous',
  icon: FileText,
  color: 'bg-gray-500',
  items: []
}];
const DEFAULT_LINE_ITEMS: Record<string, Array<{
  description: string;
  unit_cost: number;
  quantity: number;
}>> = {
  transportation: [{
    description: 'Charter Bus Rental',
    unit_cost: 2500,
    quantity: 1
  }, {
    description: 'Bus Driver Gratuity',
    unit_cost: 100,
    quantity: 1
  }, {
    description: 'Fuel Surcharge',
    unit_cost: 300,
    quantity: 1
  }],
  lodging: [{
    description: 'Hotel Rooms (Double Occupancy)',
    unit_cost: 129,
    quantity: 14
  }, {
    description: 'Director Suite',
    unit_cost: 179,
    quantity: 1
  }, {
    description: 'Accompanist Room',
    unit_cost: 129,
    quantity: 1
  }],
  meals: [{
    description: 'Bus Snacks & Drinks',
    unit_cost: 150,
    quantity: 1
  }, {
    description: 'Group Dinner',
    unit_cost: 25,
    quantity: 44
  }, {
    description: 'Breakfast (if not included)',
    unit_cost: 15,
    quantity: 44
  }],
  stipends: [{
    description: 'Singer Per Diem',
    unit_cost: 50,
    quantity: 44
  }],
  performance: [{
    description: 'Performance Attire Cleaning',
    unit_cost: 200,
    quantity: 1
  }, {
    description: 'Music Supplies',
    unit_cost: 50,
    quantity: 1
  }],
  misc: [{
    description: 'Emergency Fund',
    unit_cost: 500,
    quantity: 1
  }, {
    description: 'Parking Fees',
    unit_cost: 50,
    quantity: 1
  }]
};
export const TourBudgetManager = () => {
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [revenues, setRevenues] = useState<Array<{
    id: string;
    source: string;
    amount: number;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingRevenue, setIsAddingRevenue] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetLineItem | null>(null);
  const {
    toast
  } = useToast();
  const [newItem, setNewItem] = useState({
    category: 'transportation',
    description: '',
    unit_cost: '',
    quantity: '1',
    notes: '',
    status: 'planned' as const
  });
  const [newRevenue, setNewRevenue] = useState({
    source: '',
    amount: '',
    status: 'expected'
  });

  // Load from Supabase
  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      // Fetch budget items
      const {
        data: items,
        error: itemsError
      } = await supabase.from('tour_budget_items').select('*').order('created_at', {
        ascending: true
      });
      if (itemsError) throw itemsError;

      // Fetch revenues
      const {
        data: revs,
        error: revsError
      } = await supabase.from('tour_budget_revenues').select('*').order('created_at', {
        ascending: true
      });
      if (revsError) throw revsError;
      setBudgetItems((items || []).map(item => ({
        id: item.id,
        category: item.category,
        description: item.description,
        estimated_cost: item.unit_cost * item.quantity,
        actual_cost: item.actual_cost || 0,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        notes: item.notes || undefined,
        status: item.status as 'planned' | 'confirmed' | 'paid'
      })));
      setRevenues((revs || []).map(rev => ({
        id: rev.id,
        source: rev.source,
        amount: rev.amount,
        status: rev.status
      })));
    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast({
        title: "Error",
        description: "Failed to load budget data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchBudgetData();

    // Subscribe to realtime updates
    const itemsChannel = supabase.channel('tour-budget-items-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tour_budget_items'
    }, () => fetchBudgetData()).subscribe();
    const revenuesChannel = supabase.channel('tour-budget-revenues-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tour_budget_revenues'
    }, () => fetchBudgetData()).subscribe();
    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(revenuesChannel);
    };
  }, []);
  const calculateSummary = (): TourBudgetSummary => {
    const total_estimated = budgetItems.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
    const total_actual = budgetItems.reduce((sum, item) => sum + item.actual_cost, 0);
    const total_revenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    return {
      total_estimated,
      total_actual,
      total_revenue,
      net_balance: total_revenue - (total_actual || total_estimated)
    };
  };
  const handleAddItem = async () => {
    if (!newItem.description || !newItem.unit_cost) {
      toast({
        title: "Missing fields",
        description: "Please fill in description and cost",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('tour_budget_items').insert([{
        category: newItem.category,
        description: newItem.description,
        unit_cost: parseFloat(newItem.unit_cost),
        quantity: parseInt(newItem.quantity) || 1,
        notes: newItem.notes || null,
        status: newItem.status
      }]);
      if (error) throw error;
      setNewItem({
        category: 'transportation',
        description: '',
        unit_cost: '',
        quantity: '1',
        notes: '',
        status: 'planned'
      });
      setIsAddingItem(false);
      toast({
        title: "Item added",
        description: "Budget line item has been added"
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add budget item",
        variant: "destructive"
      });
    }
  };
  const handleUpdateItem = async (id: string, updates: Partial<BudgetLineItem>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.actual_cost !== undefined) dbUpdates.actual_cost = updates.actual_cost;
      if (updates.unit_cost !== undefined) dbUpdates.unit_cost = updates.unit_cost;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      const {
        error
      } = await supabase.from('tour_budget_items').update(dbUpdates).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };
  const handleDeleteItem = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('tour_budget_items').delete().eq('id', id);
      if (error) throw error;
      toast({
        title: "Item deleted"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };
  const handleAddRevenue = async () => {
    if (!newRevenue.source || !newRevenue.amount) {
      toast({
        title: "Missing fields",
        description: "Please fill in source and amount",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('tour_budget_revenues').insert([{
        source: newRevenue.source,
        amount: parseFloat(newRevenue.amount),
        status: newRevenue.status
      }]);
      if (error) throw error;
      setNewRevenue({
        source: '',
        amount: '',
        status: 'expected'
      });
      setIsAddingRevenue(false);
      toast({
        title: "Revenue added"
      });
    } catch (error) {
      console.error('Error adding revenue:', error);
      toast({
        title: "Error",
        description: "Failed to add revenue",
        variant: "destructive"
      });
    }
  };
  const handleDeleteRevenue = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('tour_budget_revenues').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting revenue:', error);
      toast({
        title: "Error",
        description: "Failed to delete revenue",
        variant: "destructive"
      });
    }
  };
  const loadDefaultItems = async (category: string) => {
    const defaults = DEFAULT_LINE_ITEMS[category] || [];
    const newItems = defaults.map(d => ({
      category,
      description: d.description,
      unit_cost: d.unit_cost,
      quantity: d.quantity,
      status: 'planned' as const
    }));
    try {
      const {
        error
      } = await supabase.from('tour_budget_items').insert(newItems);
      if (error) throw error;
      toast({
        title: "Default items added",
        description: `Added ${newItems.length} default items for ${category}`
      });
    } catch (error) {
      console.error('Error loading default items:', error);
      toast({
        title: "Error",
        description: "Failed to add default items",
        variant: "destructive"
      });
    }
  };
  const summary = calculateSummary();
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
  const getItemsByCategory = (categoryId: string) => budgetItems.filter(item => item.category === categoryId);
  const getCategoryTotal = (categoryId: string) => {
    return getItemsByCategory(categoryId).reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'confirmed':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };
  return <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tour Budget</h2>
          <p className="text-sm text-muted-foreground">Plan and track tour expenses and revenue</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingRevenue} onOpenChange={setIsAddingRevenue}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Add Revenue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Revenue Source</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Revenue Source</Label>
                  <Input value={newRevenue.source} onChange={e => setNewRevenue(prev => ({
                  ...prev,
                  source: e.target.value
                }))} placeholder="e.g., Syracuse Jazz Festival Stipend" />
                </div>
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input type="number" value={newRevenue.amount} onChange={e => setNewRevenue(prev => ({
                  ...prev,
                  amount: e.target.value
                }))} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newRevenue.status} onValueChange={v => setNewRevenue(prev => ({
                  ...prev,
                  status: v
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expected">Expected</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddRevenue} className="w-full">Add Revenue</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newItem.category} onValueChange={v => setNewItem(prev => ({
                  ...prev,
                  category: v
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={newItem.description} onChange={e => setNewItem(prev => ({
                  ...prev,
                  description: e.target.value
                }))} placeholder="e.g., Charter Bus Rental" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Cost ($)</Label>
                    <Input type="number" value={newItem.unit_cost} onChange={e => setNewItem(prev => ({
                    ...prev,
                    unit_cost: e.target.value
                  }))} placeholder="100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={newItem.quantity} onChange={e => setNewItem(prev => ({
                    ...prev,
                    quantity: e.target.value
                  }))} placeholder="1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={newItem.notes} onChange={e => setNewItem(prev => ({
                  ...prev,
                  notes: e.target.value
                }))} placeholder="Optional notes..." rows={2} />
                </div>
                <Button onClick={handleAddItem} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-primary-foreground">Revenue</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calculator className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-secondary-foreground">Estimated</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.total_estimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-secondary-foreground">Actual</span>
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.total_actual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs text-primary-foreground">Net Balance</span>
            </div>
            <p className={`text-xl font-bold ${summary.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.net_balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Category Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {BUDGET_CATEGORIES.map(category => {
            const items = getItemsByCategory(category.id);
            const total = getCategoryTotal(category.id);
            const percentage = summary.total_estimated > 0 ? total / summary.total_estimated * 100 : 0;
            return <Card key={category.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <div className={`p-1.5 rounded ${category.color}`}>
                          <category.icon className="h-4 w-4 text-white" />
                        </div>
                        {category.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-primary-foreground">{items.length} items</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-foreground">Total</span>
                        <span className="font-semibold text-primary-foreground">{formatCurrency(total)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-primary-foreground">{percentage.toFixed(1)}% of budget</p>
                      
                      {items.length === 0 && <Button variant="ghost" size="sm" onClick={() => loadDefaultItems(category.id)} className="w-full text-xs text-primary-foreground">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Default Items
                        </Button>}
                    </div>
                  </CardContent>
                </Card>;
          })}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {BUDGET_CATEGORIES.map(category => {
          const items = getItemsByCategory(category.id);
          if (items.length === 0) return null;
          return <Card key={category.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <category.icon className="h-4 w-4" />
                    {category.name}
                    <Badge variant="secondary" className="ml-auto">
                      {formatCurrency(getCategoryTotal(category.id))}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {items.map(item => <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                        {getStatusIcon(item.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-primary-foreground">{item.description}</p>
                          <p className="text-xs text-primary-foreground">
                            {item.quantity} × {formatCurrency(item.unit_cost)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(item.unit_cost * item.quantity)}</p>
                          {item.actual_cost > 0 && <p className="text-xs text-muted-foreground">
                              Actual: {formatCurrency(item.actual_cost)}
                            </p>}
                        </div>
                        <div className="flex gap-1">
                          <Select value={item.status} onValueChange={v => handleUpdateItem(item.id, {
                      status: v as BudgetLineItem['status']
                    })}>
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planned">Planned</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete "{item.description}"? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>)}
                  </div>
                </CardContent>
              </Card>;
        })}
          
          {budgetItems.length === 0 && <Card className="p-12 text-center">
              <Calculator className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Budget Items</h3>
              <p className="text-muted-foreground mb-4">Start building your tour budget by adding expenses.</p>
              <Button onClick={() => setIsAddingItem(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </Card>}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Revenue Sources
                <Badge variant="secondary" className="ml-auto">
                  {formatCurrency(summary.total_revenue)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {revenues.length === 0 ? <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground mb-4">No revenue sources added yet.</p>
                  <Button variant="outline" onClick={() => setIsAddingRevenue(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Revenue
                  </Button>
                </div> : <div className="space-y-2">
                  {revenues.map(rev => <div key={rev.id} className="flex items-center gap-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rev.source}</p>
                        <Badge variant="outline" className="text-xs">
                          {rev.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(rev.amount)}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRevenue(rev.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};