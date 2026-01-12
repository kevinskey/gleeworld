import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, ShoppingCart, TrendingUp, Plus, AlertTriangle, 
  Truck, Eye, Download, RefreshCw, DollarSign, Clock,
  CheckCircle, XCircle, PackageCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ProductManager } from "@/components/admin/ProductManager";

interface OrderStats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  monthlyRevenue: number;
  monthlyOrders: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  total_amount: number;
  requires_shipping: boolean;
  easypost_tracking_code: string | null;
  easypost_label_url: string | null;
  created_at: string;
  gw_order_items: any[];
}

const InventoryShop = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<OrderStats>({
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    paidOrders: 0,
    shippedOrders: 0,
    monthlyRevenue: 0,
    monthlyOrders: 0
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingLabel, setCreatingLabel] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch product stats
      const { data: products, error: productsError } = await supabase
        .from('gw_products')
        .select('id, is_active, inventory_quantity');

      if (productsError) throw productsError;

      const activeProducts = products?.filter(p => p.is_active) || [];
      const lowStock = products?.filter(p => p.is_active && p.inventory_quantity < 5) || [];

      // Fetch order stats for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyOrdersData, error: ordersError } = await supabase
        .from('gw_orders')
        .select('id, status, payment_status, total_amount')
        .gte('created_at', startOfMonth.toISOString());

      if (ordersError) throw ordersError;

      const paidOrders = monthlyOrdersData?.filter(o => o.payment_status === 'paid') || [];
      const monthlyRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      // Count by status
      const { data: allOrders } = await supabase
        .from('gw_orders')
        .select('status, payment_status');

      const pending = allOrders?.filter(o => o.payment_status === 'paid' && o.status === 'paid').length || 0;
      const shipped = allOrders?.filter(o => o.status === 'shipped').length || 0;

      setStats({
        totalProducts: products?.length || 0,
        activeProducts: activeProducts.length,
        lowStockCount: lowStock.length,
        pendingOrders: pending,
        paidOrders: paidOrders.length,
        shippedOrders: shipped,
        monthlyRevenue,
        monthlyOrders: monthlyOrdersData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_orders')
        .select('*, gw_order_items(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createShippingLabel = async (orderId: string) => {
    try {
      setCreatingLabel(orderId);
      const { data, error } = await supabase.functions.invoke('create-shipping-label', {
        body: { order_id: orderId }
      });

      if (error) throw error;

      toast({
        title: "Label Created",
        description: `Tracking: ${data.tracking_code}`,
      });

      fetchOrders();
      fetchStats();
    } catch (error: any) {
      console.error('Error creating label:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create shipping label",
        variant: "destructive"
      });
    } finally {
      setCreatingLabel(null);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gw_orders')
        .update({ status, shipped_at: status === 'shipped' ? new Date().toISOString() : null })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order marked as ${status}`,
      });

      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus !== 'paid') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Unpaid</Badge>;
    }
    
    switch (status) {
      case 'paid':
        return <Badge className="bg-blue-500">Ready to Ship</Badge>;
      case 'processing':
        return <Badge className="bg-purple-500">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-green-500">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-emerald-600">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory & Shop</h1>
          <p className="text-muted-foreground">Merchandise, orders, and shipping management</p>
        </div>
        <Button onClick={() => { fetchStats(); fetchOrders(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4 text-muted-foreground" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalProducts} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-blue-500" />
              Pending Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">orders ready to ship</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-green-500" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.paidOrders} paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">items need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Manage orders and create shipping labels</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No orders yet</div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{order.order_number}</span>
                            {getStatusBadge(order.status, order.payment_status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customer_name} • {order.customer_email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">${order.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.gw_order_items?.length || 0} items
                          </p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="bg-muted/50 rounded p-2 text-sm">
                        {order.gw_order_items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.product_title} × {item.quantity}</span>
                            <span>${item.total_price?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions for paid orders */}
                      {order.payment_status === 'paid' && order.requires_shipping && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {!order.easypost_label_url ? (
                            <Button 
                              size="sm" 
                              onClick={() => createShippingLabel(order.id)}
                              disabled={creatingLabel === order.id}
                            >
                              {creatingLabel === order.id ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Truck className="mr-2 h-4 w-4" />
                              )}
                              Create Label
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <a href={order.easypost_label_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Label
                                </a>
                              </Button>
                              {order.easypost_tracking_code && (
                                <Badge variant="outline" className="font-mono">
                                  {order.easypost_tracking_code}
                                </Badge>
                              )}
                            </>
                          )}

                          {order.status === 'processing' && order.easypost_label_url && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => updateOrderStatus(order.id, 'shipped')}
                            >
                              <PackageCheck className="mr-2 h-4 w-4" />
                              Mark Shipped
                            </Button>
                          )}

                          {order.status === 'shipped' && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <ProductManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryShop;
