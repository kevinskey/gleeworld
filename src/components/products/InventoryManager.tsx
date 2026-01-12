import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Boxes, Search, RefreshCw, Plus, ArrowUp, ArrowDown,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface Product {
  id: string;
  title: string;
  sku: string | null;
  inventory_count: number;
  low_stock_threshold: number | null;
  track_inventory: boolean;
}

interface InventoryMovement {
  id: string;
  product_id: string | null;
  delta_qty: number;
  reason: string;
  notes: string | null;
  created_at: string;
  gw_products?: {
    title: string;
  };
}

export const InventoryManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [adjustmentForm, setAdjustmentForm] = useState({
    product_id: '',
    delta_qty: 0,
    reason: 'adjustment' as 'adjustment' | 'restock' | 'sale' | 'return' | 'refund',
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_products')
        .select('id, title, inventory_quantity, low_stock_threshold, track_inventory')
        .eq('track_inventory', true)
        .order('title', { ascending: true });

      if (error) throw error;
      const mappedData = (data || []).map(p => ({
        id: p.id,
        title: p.title,
        sku: null,
        inventory_count: p.inventory_quantity || 0,
        low_stock_threshold: p.low_stock_threshold,
        track_inventory: p.track_inventory || false
      }));
      setProducts(mappedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_inventory_movements')
        .select(`
          *,
          gw_products (title)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      console.error('Error fetching movements:', error);
    }
  };

  const handleAdjustment = async () => {
    try {
      // Insert movement record
      const { error: movementError } = await supabase
        .from('gw_inventory_movements')
        .insert([{
          product_id: adjustmentForm.product_id,
          delta_qty: adjustmentForm.delta_qty,
          reason: adjustmentForm.reason,
          notes: adjustmentForm.notes || null
        }]);

      if (movementError) throw movementError;

      // Update product inventory
      const product = products.find(p => p.id === adjustmentForm.product_id);
      if (product) {
        const newCount = product.inventory_count + adjustmentForm.delta_qty;
        const { error: updateError } = await supabase
          .from('gw_products')
          .update({ inventory_quantity: Math.max(0, newCount) })
          .eq('id', adjustmentForm.product_id);

        if (updateError) throw updateError;
      }

      toast({ title: "Success", description: "Inventory adjusted" });
      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
      fetchMovements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setAdjustmentForm({
      product_id: '',
      delta_qty: 0,
      reason: 'adjustment',
      notes: ''
    });
    setSelectedProduct(null);
  };

  const openAdjustDialog = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm({
      ...adjustmentForm,
      product_id: product.id
    });
    setIsDialogOpen(true);
  };

  const getStockBadge = (product: Product) => {
    const threshold = product.low_stock_threshold || 5;
    if (product.inventory_count <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (product.inventory_count <= threshold) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    }
    return <Badge variant="outline">In Stock</Badge>;
  };

  const getReasonBadge = (reason: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      sale: { variant: 'default', label: 'Sale' },
      refund: { variant: 'secondary', label: 'Refund' },
      return: { variant: 'secondary', label: 'Return' },
      adjustment: { variant: 'outline', label: 'Adjustment' },
      restock: { variant: 'default', label: 'Restock' }
    };
    const c = config[reason] || { variant: 'outline' as const, label: reason };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => 
    p.inventory_count <= (p.low_stock_threshold || 5)
  ).length;

  const outOfStockCount = products.filter(p => p.inventory_count <= 0).length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="stock" className="flex items-center gap-1.5">
            <Boxes className="w-4 h-4" />
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-1.5">
            <ArrowUp className="w-4 h-4" />
            Movements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Low Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Movements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{movements.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={fetchProducts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stock Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Low Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No products with inventory tracking
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell className="font-mono">{product.sku || '-'}</TableCell>
                        <TableCell className="font-bold">{product.inventory_count}</TableCell>
                        <TableCell>{product.low_stock_threshold || 5}</TableCell>
                        <TableCell>{getStockBadge(product)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openAdjustDialog(product)}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No inventory movements recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{movement.gw_products?.title || 'Unknown Product'}</TableCell>
                        <TableCell>
                          <span className={movement.delta_qty > 0 ? 'text-green-600' : 'text-red-600'}>
                            {movement.delta_qty > 0 ? '+' : ''}{movement.delta_qty}
                          </span>
                        </TableCell>
                        <TableCell>{getReasonBadge(movement.reason)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {movement.notes || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(movement.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adjust Inventory: {selectedProduct?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Current Stock: <strong>{selectedProduct?.inventory_count}</strong>
            </div>
            <div className="space-y-2">
              <Label>Quantity Change</Label>
              <Input
                type="number"
                value={adjustmentForm.delta_qty}
                onChange={(e) => setAdjustmentForm({
                  ...adjustmentForm, 
                  delta_qty: parseInt(e.target.value) || 0
                })}
                placeholder="e.g., 10 or -5"
              />
              <p className="text-xs text-muted-foreground">
                Use positive for additions, negative for reductions
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select 
                value={adjustmentForm.reason} 
                onValueChange={(v: any) => setAdjustmentForm({...adjustmentForm, reason: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="restock">Restock</SelectItem>
                  <SelectItem value="return">Customer Return</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={adjustmentForm.notes}
                onChange={(e) => setAdjustmentForm({...adjustmentForm, notes: e.target.value})}
                placeholder="Reason for adjustment..."
              />
            </div>
            <Button onClick={handleAdjustment} className="w-full">
              Apply Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
