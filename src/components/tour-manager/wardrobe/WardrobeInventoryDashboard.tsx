import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, AlertTriangle, Edit, Minus, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  size_options: string[];
  color_options: string[];
  total_quantity: number;
  available_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const categoryColors = {
  formal: 'bg-purple-100 text-purple-800 border-purple-200',
  accessories: 'bg-pink-100 text-pink-800 border-pink-200',
  cosmetics: 'bg-rose-100 text-rose-800 border-rose-200',
  casual: 'bg-blue-100 text-blue-800 border-blue-200',
  performance: 'bg-green-100 text-green-800 border-green-200',
  shoes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  travel: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  special: 'bg-amber-100 text-amber-800 border-amber-200',
};

export const WardrobeInventoryDashboard = () => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  const [updateForm, setUpdateForm] = useState({
    action: 'add',
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async () => {
    if (!selectedItem || updateForm.quantity <= 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let newTotalQuantity = selectedItem.total_quantity;
      let newAvailableQuantity = selectedItem.available_quantity;

      if (updateForm.action === 'add') {
        newTotalQuantity += updateForm.quantity;
        newAvailableQuantity += updateForm.quantity;
      } else if (updateForm.action === 'remove') {
        if (updateForm.quantity > selectedItem.available_quantity) {
          toast.error('Cannot remove more items than available');
          return;
        }
        newTotalQuantity -= updateForm.quantity;
        newAvailableQuantity -= updateForm.quantity;
      } else if (updateForm.action === 'set') {
        const checkedOut = selectedItem.total_quantity - selectedItem.available_quantity;
        newTotalQuantity = updateForm.quantity;
        newAvailableQuantity = Math.max(0, updateForm.quantity - checkedOut);
      }

      const { error } = await supabase
        .from('wardrobe_items')
        .update({
          total_quantity: Math.max(0, newTotalQuantity),
          available_quantity: Math.max(0, newAvailableQuantity),
          notes: updateForm.notes || selectedItem.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Inventory updated successfully');
      setShowUpdateDialog(false);
      setSelectedItem(null);
      setUpdateForm({
        action: 'add',
        quantity: 0,
        notes: ''
      });
      fetchItems();
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  const openUpdateDialog = (item: WardrobeItem) => {
    setSelectedItem(item);
    setUpdateForm({
      action: 'add',
      quantity: 0,
      notes: item.notes || ''
    });
    setShowUpdateDialog(true);
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockItems = items.filter(item => item.available_quantity === 0);
  const categories = [...new Set(items.map(item => item.category))];

  if (loading) {
    return <div className="flex justify-center p-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">Inventory Management</h2>
        <p className="text-blue-600 text-sm">
          Manage wardrobe item quantities and track availability
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold">{items.reduce((sum, item) => sum + item.total_quantity, 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{items.reduce((sum, item) => sum + item.available_quantity, 0)}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Out of Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Out of Stock Items ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Out of Stock</Badge>
                    <Button
                      size="sm"
                      onClick={() => openUpdateDialog(item)}
                    >
                      Add Stock
                    </Button>
                  </div>
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
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge className={categoryColors[item.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}>
                    {item.category}
                  </Badge>
                </div>
                {item.available_quantity === 0 && (
                  <Badge variant="destructive">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Stock:</span>
                  <span className="text-sm font-bold">{item.total_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Available:</span>
                  <span className={`text-sm font-bold ${item.available_quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.available_quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Checked Out:</span>
                  <span className="text-sm">{item.total_quantity - item.available_quantity}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{
                      width: item.total_quantity > 0 ? `${(item.available_quantity / item.total_quantity) * 100}%` : '0%'
                    }}
                  ></div>
                </div>

                {item.size_options?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Sizes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.size_options.map(size => (
                        <Badge key={size} variant="outline" className="text-xs">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.color_options?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Colors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.color_options.map(color => (
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

                <Button 
                  onClick={() => openUpdateDialog(item)} 
                  className="w-full mt-3"
                  size="sm"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Update Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No inventory items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Items are already set up - use the update button to add quantities
            </p>
          </CardContent>
        </Card>
      )}

      {/* Update Inventory Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Inventory</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium">{selectedItem.name}</h4>
                <p className="text-sm text-gray-600">Current stock: {selectedItem.total_quantity}</p>
                <p className="text-sm text-gray-600">Available: {selectedItem.available_quantity}</p>
                <p className="text-sm text-gray-600">Checked out: {selectedItem.total_quantity - selectedItem.available_quantity}</p>
              </div>

              <div>
                <Label>Action</Label>
                <Select value={updateForm.action} onValueChange={(value) => setUpdateForm({...updateForm, action: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add to inventory</SelectItem>
                    <SelectItem value="remove">Remove from inventory</SelectItem>
                    <SelectItem value="set">Set total quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {updateForm.action === 'add' ? 'Quantity to Add' : 
                   updateForm.action === 'remove' ? 'Quantity to Remove' : 
                   'Set Total Quantity'}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={updateForm.quantity}
                  onChange={(e) => setUpdateForm({...updateForm, quantity: parseInt(e.target.value) || 0})}
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({...updateForm, notes: e.target.value})}
                  placeholder="Add notes about this inventory update..."
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateQuantity} 
                  className="flex-1"
                  disabled={updateForm.quantity <= 0}
                >
                  {updateForm.action === 'add' ? <Plus className="h-4 w-4 mr-2" /> : 
                   updateForm.action === 'remove' ? <Minus className="h-4 w-4 mr-2" /> : 
                   <Edit className="h-4 w-4 mr-2" />}
                  Update Inventory
                </Button>
                <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};