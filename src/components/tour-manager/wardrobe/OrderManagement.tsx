import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Calendar, DollarSign, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_type: string;
  item_description: string;
  quantities?: any;
  estimated_cost?: number;
  budget_notes?: string;
  status: string;
  vendor_name?: string;
  order_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  created_at: string;
}

const orderTypes = {
  formal_dress: 'Formal Dress',
  lipstick: 'Lipstick',
  pearls: 'Pearls',
  semi_formal_polo: 'Semi-Formal Polo',
  casual_tshirt: 'Casual T-Shirt'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  ordered: 'bg-blue-100 text-blue-800',
  shipped: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-orange-100 text-orange-800',
  received: 'bg-green-100 text-green-800'
};

export const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [orderForm, setOrderForm] = useState({
    order_type: '',
    item_description: '',
    quantities: '',
    estimated_cost: '',
    budget_notes: '',
    vendor_name: '',
    order_date: '',
    expected_delivery_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_wardrobe_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const quantities = orderForm.quantities ? JSON.parse(orderForm.quantities) : null;

      const { error } = await supabase
        .from('gw_wardrobe_orders')
        .insert({
          ...orderForm,
          quantities,
          estimated_cost: orderForm.estimated_cost ? parseFloat(orderForm.estimated_cost) : null,
          ordered_by: user.id
        });

      if (error) throw error;

      toast.success('Order created successfully');
      setShowOrderDialog(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = { status: newStatus };
      
      if (newStatus === 'received') {
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
        updateData.received_by = user.id;
      }

      const { error } = await supabase
        .from('gw_wardrobe_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const resetForm = () => {
    setOrderForm({
      order_type: '',
      item_description: '',
      quantities: '',
      estimated_cost: '',
      budget_notes: '',
      vendor_name: '',
      order_date: '',
      expected_delivery_date: '',
      notes: ''
    });
    setEditingOrder(null);
  };

  const openEditDialog = (order: Order) => {
    setEditingOrder(order);
    setOrderForm({
      order_type: order.order_type,
      item_description: order.item_description,
      quantities: order.quantities ? JSON.stringify(order.quantities, null, 2) : '',
      estimated_cost: order.estimated_cost?.toString() || '',
      budget_notes: order.budget_notes || '',
      vendor_name: order.vendor_name || '',
      order_date: order.order_date || '',
      expected_delivery_date: order.expected_delivery_date || '',
      notes: order.notes || ''
    });
    setShowOrderDialog(true);
  };

  const filteredOrders = orders.filter(order => 
    selectedStatus === 'all' || order.status === selectedStatus
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? 'Edit Order' : 'Create New Order'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Type</Label>
                  <Select value={orderForm.order_type} onValueChange={(value) => setOrderForm({...orderForm, order_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(orderTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orderForm.estimated_cost}
                    onChange={(e) => setOrderForm({...orderForm, estimated_cost: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label>Item Description</Label>
                <Textarea
                  value={orderForm.item_description}
                  onChange={(e) => setOrderForm({...orderForm, item_description: e.target.value})}
                  placeholder="Detailed description of items needed..."
                />
              </div>

              <div>
                <Label>Quantities (JSON format)</Label>
                <Textarea
                  value={orderForm.quantities}
                  onChange={(e) => setOrderForm({...orderForm, quantities: e.target.value})}
                  placeholder='{"XS": 2, "S": 5, "M": 8, "L": 6, "XL": 3}'
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use JSON format to specify quantities by size, color, or other attributes
                </p>
              </div>

              <div>
                <Label>Budget Notes</Label>
                <Textarea
                  value={orderForm.budget_notes}
                  onChange={(e) => setOrderForm({...orderForm, budget_notes: e.target.value})}
                  placeholder="Notes about budget allocation, funding source, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendor Name</Label>
                  <Input
                    value={orderForm.vendor_name}
                    onChange={(e) => setOrderForm({...orderForm, vendor_name: e.target.value})}
                    placeholder="Vendor or supplier name"
                  />
                </div>
                <div>
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={orderForm.order_date}
                    onChange={(e) => setOrderForm({...orderForm, order_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={orderForm.expected_delivery_date}
                  onChange={(e) => setOrderForm({...orderForm, expected_delivery_date: e.target.value})}
                />
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                  placeholder="Any additional notes or special instructions..."
                />
              </div>

              <Button onClick={handleCreateOrder} className="w-full">
                {editingOrder ? 'Update Order' : 'Create Order'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {orderTypes[order.order_type as keyof typeof orderTypes]}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                    {order.status}
                  </Badge>
                  {order.estimated_cost && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${order.estimated_cost.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm">{order.item_description}</p>
                
                {order.quantities && (
                  <div>
                    <span className="text-sm font-medium">Quantities: </span>
                    <span className="text-sm">{JSON.stringify(order.quantities)}</span>
                  </div>
                )}

                {order.vendor_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-3 w-3" />
                    <span>Vendor: {order.vendor_name}</span>
                  </div>
                )}

                {order.order_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3" />
                    <span>Ordered: {new Date(order.order_date).toLocaleDateString()}</span>
                  </div>
                )}

                {order.expected_delivery_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-3 w-3" />
                    <span>Expected: {new Date(order.expected_delivery_date).toLocaleDateString()}</span>
                  </div>
                )}

                {order.budget_notes && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Budget Notes: </span>
                    {order.budget_notes}
                  </div>
                )}

                {order.notes && (
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                )}

                {/* Status Update Buttons */}
                <div className="flex gap-2 pt-2">
                  {order.status === 'draft' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdateOrderStatus(order.id, 'ordered')}
                    >
                      Mark as Ordered
                    </Button>
                  )}
                  {order.status === 'ordered' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                    >
                      Mark as Shipped
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  {order.status === 'delivered' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdateOrderStatus(order.id, 'received')}
                    >
                      Mark as Received
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditDialog(order)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first order to start tracking wardrobe purchases
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};