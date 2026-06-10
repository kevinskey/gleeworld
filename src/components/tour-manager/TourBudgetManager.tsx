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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DollarSign, Plus, Edit2, Trash2, Bus, Hotel, Utensils, Music, Users, FileText, TrendingUp, Calculator, CheckCircle, Clock, AlertCircle, ChevronDown } from 'lucide-react';
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

const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'transportation', name: 'Transportation', icon: Bus, color: 'bg-blue-500', items: [] },
  { id: 'lodging', name: 'Lodging', icon: Hotel, color: 'bg-purple-500', items: [] },
  { id: 'meals', name: 'Meals & Food', icon: Utensils, color: 'bg-orange-500', items: [] },
  { id: 'stipends', name: 'Singer Stipends', icon: Users, color: 'bg-green-500', items: [] },
  { id: 'performance', name: 'Performance Costs', icon: Music, color: 'bg-pink-500', items: [] },
  { id: 'misc', name: 'Miscellaneous', icon: FileText, color: 'bg-muted-foreground', items: [] },
];

export const TourBudgetManager = () => {
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [revenues, setRevenues] = useState<Array<{ id: string; source: string; amount: number; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingRevenue, setIsAddingRevenue] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetLineItem | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [newItem, setNewItem] = useState({
    category: 'transportation',
    description: '',
    unit_cost: '',
    quantity: '1',
    notes: '',
    status: 'planned' as const,
  });

  const [newRevenue, setNewRevenue] = useState({ source: '', amount: '', status: 'expected' });

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const { data: items, error: itemsError } = await supabase
        .from('tour_budget_items')
        .select('*')
        .order('created_at', { ascending: true });
      if (itemsError) throw itemsError;

      const { data: revs, error: revsError } = await supabase
        .from('tour_budget_revenues')
        .select('*')
        .order('created_at', { ascending: true });
      if (revsError) throw revsError;

      setBudgetItems(
        (items || []).map((item) => ({
          id: item.id,
          category: item.category,
          description: item.description,
          estimated_cost: item.unit_cost * item.quantity,
          actual_cost: item.actual_cost || 0,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          notes: item.notes || undefined,
          status: item.status as 'planned' | 'confirmed' | 'paid',
        }))
      );
      setRevenues(
        (revs || []).map((rev) => ({
          id: rev.id,
          source: rev.source,
          amount: rev.amount,
          status: rev.status,
        }))
      );
    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast({ title: 'Error', description: 'Failed to load budget data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
    const itemsChannel = supabase
      .channel('tour-budget-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_budget_items' }, () => fetchBudgetData())
      .subscribe();
    const revenuesChannel = supabase
      .channel('tour-budget-revenues-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_budget_revenues' }, () => fetchBudgetData())
      .subscribe();
    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(revenuesChannel);
    };
  }, []);

  const calculateSummary = (): TourBudgetSummary => {
    const total_estimated = budgetItems.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
    const total_actual = budgetItems.reduce((sum, item) => sum + item.actual_cost, 0);
    const total_revenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    return { total_estimated, total_actual, total_revenue, net_balance: total_revenue - (total_actual || total_estimated) };
  };

  const handleAddItem = async () => {
    if (!newItem.description || !newItem.unit_cost) {
      toast({ title: 'Missing fields', description: 'Please fill in description and cost', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('tour_budget_items').insert([{
        category: newItem.category,
        description: newItem.description,
        unit_cost: parseFloat(newItem.unit_cost),
        quantity: parseInt(newItem.quantity) || 1,
        notes: newItem.notes || null,
        status: newItem.status,
      }]);
      if (error) throw error;
      setNewItem({ category: 'transportation', description: '', unit_cost: '', quantity: '1', notes: '', status: 'planned' });
      setIsAddingItem(false);
      toast({ title: 'Item added', description: 'Budget line item has been added' });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({ title: 'Error', description: 'Failed to add budget item', variant: 'destructive' });
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<BudgetLineItem>) => {
    setBudgetItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...updates, estimated_cost: (updates.unit_cost ?? item.unit_cost) * (updates.quantity ?? item.quantity) }
          : item
      )
    );
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.actual_cost !== undefined) dbUpdates.actual_cost = updates.actual_cost;
      if (updates.unit_cost !== undefined) dbUpdates.unit_cost = updates.unit_cost;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      const { error } = await supabase.from('tour_budget_items').update(dbUpdates).eq('id', id);
      if (error) throw error;
      toast({ title: 'Updated', description: 'Budget item saved' });
    } catch (error) {
      console.error('Error updating item:', error);
      fetchBudgetData();
      toast({ title: 'Error', description: 'Failed to update item', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('tour_budget_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Item deleted' });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  };

  const handleAddRevenue = async () => {
    if (!newRevenue.source || !newRevenue.amount) {
      toast({ title: 'Missing fields', description: 'Please fill in source and amount', variant: 'destructive' });
      return;
    }
    const amount = parseFloat(String(newRevenue.amount).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(amount)) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid number', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('tour_budget_revenues').insert([{ source: newRevenue.source, amount, status: newRevenue.status }]);
      if (error) throw error;
      setNewRevenue({ source: '', amount: '', status: 'expected' });
      setIsAddingRevenue(false);
      toast({ title: 'Revenue added' });
    } catch (error) {
      console.error('Error adding revenue:', error);
      toast({ title: 'Error', description: 'Failed to add revenue', variant: 'destructive' });
    }
  };

  const handleDeleteRevenue = async (id: string) => {
    try {
      const { error } = await supabase.from('tour_budget_revenues').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting revenue:', error);
      toast({ title: 'Error', description: 'Failed to delete revenue', variant: 'destructive' });
    }
  };

  const summary = calculateSummary();
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getItemsByCategory = (categoryId: string) => budgetItems.filter((item) => item.category === categoryId);
  const getCategoryTotal = (categoryId: string) =>
    getItemsByCategory(categoryId).reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
  const getCategoryActual = (categoryId: string) =>
    getItemsByCategory(categoryId).reduce((sum, item) => sum + item.actual_cost, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'confirmed':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px]"><Clock className="h-3 w-3 mr-1" />Confirmed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />Planned</Badge>;
    }
  };

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categoriesWithItems = BUDGET_CATEGORIES.filter((cat) => getItemsByCategory(cat.id).length > 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Tour Budget</h2>
          <p className="text-xs text-muted-foreground">Track tour expenses & revenue</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Dialog open={isAddingRevenue} onOpenChange={setIsAddingRevenue}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8 px-2.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add</span> Revenue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Revenue Source</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Revenue Source</Label>
                  <Input value={newRevenue.source} onChange={(e) => setNewRevenue((p) => ({ ...p, source: e.target.value }))} placeholder="e.g., Syracuse Jazz Festival Stipend" />
                </div>
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input type="number" value={newRevenue.amount} onChange={(e) => setNewRevenue((p) => ({ ...p, amount: e.target.value }))} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newRevenue.status} onValueChange={(v) => setNewRevenue((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button size="sm" className="gap-1 text-xs h-8 px-2.5">
                <Plus className="h-3.5 w-3.5" /> Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Budget Item</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newItem.category} onValueChange={(v) => setNewItem((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} placeholder="e.g., Charter Bus Rental" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Cost ($)</Label>
                    <Input type="number" value={newItem.unit_cost} onChange={(e) => setNewItem((p) => ({ ...p, unit_cost: e.target.value }))} placeholder="100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))} placeholder="1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={newItem.notes} onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
                </div>
                <Button onClick={handleAddItem} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
              {editingItem && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={editingItem.category} onValueChange={(v) => setEditingItem((p) => p ? { ...p, category: v } : null)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUDGET_CATEGORIES.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={editingItem.description} onChange={(e) => setEditingItem((p) => p ? { ...p, description: e.target.value } : null)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Cost ($)</Label>
                      <Input type="number" value={editingItem.unit_cost} onChange={(e) => setEditingItem((p) => p ? { ...p, unit_cost: parseFloat(e.target.value) || 0 } : null)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" value={editingItem.quantity} onChange={(e) => setEditingItem((p) => p ? { ...p, quantity: parseInt(e.target.value) || 1 } : null)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Cost ($)</Label>
                    <Input type="number" value={editingItem.actual_cost} onChange={(e) => setEditingItem((p) => p ? { ...p, actual_cost: parseFloat(e.target.value) || 0 } : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={editingItem.notes || ''} onChange={(e) => setEditingItem((p) => p ? { ...p, notes: e.target.value } : null)} rows={2} />
                  </div>
                  <Button
                    onClick={async () => {
                      if (editingItem) {
                        await handleUpdateItem(editingItem.id, {
                          category: editingItem.category,
                          description: editingItem.description,
                          unit_cost: editingItem.unit_cost,
                          quantity: editingItem.quantity,
                          actual_cost: editingItem.actual_cost,
                          notes: editingItem.notes,
                        });
                        setEditingItem(null);
                      }
                    }}
                    className="w-full"
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        <div className="rounded-lg bg-muted/40 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue</p>
          <p className="text-sm font-bold text-green-500 mt-0.5">{formatCurrency(summary.total_revenue)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Estimated</p>
          <p className="text-sm font-bold text-blue-500 mt-0.5">{formatCurrency(summary.total_estimated)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Actual</p>
          <p className="text-sm font-bold text-red-500 mt-0.5">{formatCurrency(summary.total_actual)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
          <p className={`text-sm font-bold mt-0.5 ${summary.net_balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(summary.net_balance)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Expenses Tab - Grouped by Category */}
        <TabsContent value="expenses" className="space-y-3 mt-3">
          {budgetItems.length === 0 ? (
            <Card className="p-12 text-center">
              <Calculator className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Budget Items</h3>
              <p className="text-muted-foreground mb-4">Start building your tour budget by adding expenses.</p>
              <Button onClick={() => setIsAddingItem(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add First Item
              </Button>
            </Card>
          ) : (
            <>
              {BUDGET_CATEGORIES.map((category) => {
                const items = getItemsByCategory(category.id);
                if (items.length === 0) return null;
                const catTotal = getCategoryTotal(category.id);
                const catActual = getCategoryActual(category.id);
                const isOpen = openCategories[category.id] !== false; // default open
                const percentage = summary.total_estimated > 0 ? (catTotal / summary.total_estimated) * 100 : 0;
                const Icon = category.icon;

                return (
                  <Collapsible key={category.id} open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left">
                          <div className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                            <div className={`p-1.5 rounded ${category.color}`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">{category.name}</h3>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                                  <span className="text-sm font-bold">{formatCurrency(catTotal)}</span>
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={percentage} className="h-1.5 flex-1" />
                                <span className="text-[10px] text-muted-foreground w-10 text-right">{percentage.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-[11px]">
                                <TableHead className="pl-4">Description</TableHead>
                                <TableHead className="text-right w-20">Qty</TableHead>
                                <TableHead className="text-right w-24">Unit Cost</TableHead>
                                <TableHead className="text-right w-28">Estimated</TableHead>
                                <TableHead className="text-right w-28">Actual</TableHead>
                                <TableHead className="w-24">Status</TableHead>
                                <TableHead className="w-20 text-right pr-4">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item) => (
                                <TableRow key={item.id} className="text-sm">
                                  <TableCell className="pl-4 font-medium">
                                    <div>
                                      <span>{item.description}</span>
                                      {item.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{item.notes}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                                  <TableCell className="text-right tabular-nums">{formatCurrency(item.unit_cost)}</TableCell>
                                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.unit_cost * item.quantity)}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {item.actual_cost > 0 ? formatCurrency(item.actual_cost) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                                  <TableCell className="text-right pr-4">
                                    <div className="flex items-center justify-end gap-0.5">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(item)}>
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                            <AlertDialogDescription>Delete "{item.description}"? This cannot be undone.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Category subtotal row */}
                              <TableRow className="bg-muted/30 font-semibold text-sm">
                                <TableCell className="pl-4" colSpan={3}>Subtotal</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(catTotal)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {catActual > 0 ? formatCurrency(catActual) : '—'}
                                </TableCell>
                                <TableCell colSpan={2} />
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}

              {/* Grand Total */}
              <Card className="border-2 border-primary/20">
                <div className="p-3 flex items-center justify-between">
                  <span className="font-semibold text-sm">Grand Total ({budgetItems.length} items)</span>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Estimated</p>
                      <p className="font-bold">{formatCurrency(summary.total_estimated)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Actual</p>
                      <p className="font-bold">{summary.total_actual > 0 ? formatCurrency(summary.total_actual) : '—'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Revenue Sources
                <Badge variant="secondary" className="ml-auto">{formatCurrency(summary.total_revenue)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {revenues.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground mb-4">No revenue sources added yet.</p>
                  <Button variant="outline" onClick={() => setIsAddingRevenue(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Revenue
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {revenues.map((rev) => (
                    <div key={rev.id} className="flex items-center gap-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rev.source}</p>
                        <Badge variant="outline" className="text-xs">{rev.status}</Badge>
                      </div>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(rev.amount)}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRevenue(rev.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
