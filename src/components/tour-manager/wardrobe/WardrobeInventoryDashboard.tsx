import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, AlertTriangle, Edit, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  category: string;
  item_name: string;
  size_available: string[];
  color_available: string[];
  quantity_total: number;
  quantity_available: number;
  quantity_checked_out: number;
  condition: string;
  low_stock_threshold: number;
  notes?: string;
}

const categoryLabels = {
  formal_dress: 'Formal Dress',
  lipstick: 'Lipstick',
  pearls: 'Pearls',
  semi_formal_polo: 'Semi-Formal Polo',
  casual_tshirt: 'Casual T-Shirt'
};

const conditionColors = {
  new: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800',
  needs_repair: 'bg-orange-100 text-orange-800',
  retired: 'bg-gray-100 text-gray-800'
};

export const WardrobeInventoryDashboard = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [newItem, setNewItem] = useState({
    category: '',
    item_name: '',
    size_available: '',
    color_available: '',
    quantity_total: 0,
    condition: 'new',
    low_stock_threshold: 5,
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_wardrobe_inventory')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('gw_wardrobe_inventory')
        .insert({
          ...newItem,
          size_available: newItem.size_available.split(',').map(s => s.trim()),
          color_available: newItem.color_available.split(',').map(s => s.trim()),
          quantity_available: newItem.quantity_total,
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Item added successfully');
      setShowAddDialog(false);
      setNewItem({
        category: '',
        item_name: '',
        size_available: '',
        color_available: '',
        quantity_total: 0,
        condition: 'new',
        low_stock_threshold: 5,
        notes: ''
      });
      fetchInventory();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockItems = inventory.filter(item => item.quantity_available <= item.low_stock_threshold);

  if (loading) {
    return <div className="flex justify-center p-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="font-medium">{item.item_name}</span>
                  <Badge variant="destructive">
                    {item.quantity_available} remaining
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={(value) => {
                  const updates: Partial<typeof newItem> = { category: value };
                  // Auto-populate item name for specific categories
                  if (value === 'lipstick') {
                    updates.item_name = 'Revlon Super Lustrous Lipstick';
                  }
                  setNewItem({...newItem, ...updates});
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item Name</Label>
                <Input
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({...newItem, item_name: e.target.value})}
                  placeholder="e.g., Black Formal Dress"
                />
              </div>
              <div>
                <Label>Available Sizes (comma-separated)</Label>
                <Input
                  value={newItem.size_available}
                  onChange={(e) => setNewItem({...newItem, size_available: e.target.value})}
                  placeholder="e.g., XS, S, M, L, XL"
                />
              </div>
              <div>
                <Label>Available Colors (comma-separated)</Label>
                <Input
                  value={newItem.color_available}
                  onChange={(e) => setNewItem({...newItem, color_available: e.target.value})}
                  placeholder="e.g., Black, Navy, Red"
                />
              </div>
              <div>
                <Label>Total Quantity</Label>
                <Input
                  type="number"
                  value={newItem.quantity_total}
                  onChange={(e) => setNewItem({...newItem, quantity_total: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={newItem.low_stock_threshold}
                  onChange={(e) => setNewItem({...newItem, low_stock_threshold: parseInt(e.target.value) || 5})}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>
              <Button onClick={handleAddItem} className="w-full">
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map(item => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.item_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {categoryLabels[item.category as keyof typeof categoryLabels]}
                  </p>
                </div>
                <Badge className={conditionColors[item.condition as keyof typeof conditionColors]}>
                  {item.condition}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Available:</span>
                  <span className="text-sm">{item.quantity_available}/{item.quantity_total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Checked Out:</span>
                  <span className="text-sm">{item.quantity_checked_out}</span>
                </div>
                {item.size_available.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Sizes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.size_available.map(size => (
                        <Badge key={size} variant="outline" className="text-xs">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {item.color_available.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Colors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.color_available.map(color => (
                        <Badge key={color} variant="outline" className="text-xs">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{item.notes}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Archive className="h-3 w-3 mr-1" />
                    Retire
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No inventory items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add items to start tracking your wardrobe inventory
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};