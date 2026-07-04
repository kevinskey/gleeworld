import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package, Truck, Eye, RefreshCw,
  CheckCircle, XCircle, Clock, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { OrderDetailDrawer } from './OrderDetailDrawer';

// Commerce Core order — one row of `gw_store_orders` as returned by the
// admin-gated `store-admin-orders` edge function. This table is NOT
// readable directly via supabase-js: it carries a RESTRICTIVE tenant-
// isolation policy with no permissive policy for `authenticated` (see
// supabase/migrations/20260705000000_commerce_core_schema.sql), so a
// normal admin session can never SELECT it over PostgREST. The edge
// function re-authenticates the caller, admin-gates on their JWT's
// tenant_role, and reads with the service role scoped to the caller's
// own tenant_id.
interface StoreOrder {
  id: string;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  store_type: 'gleeworld' | 'tenant';
  buyer_email: string;
  amount_cents: number;
  currency: string;
  requires_shipping: boolean;
  ship_to_name: string | null;
  ship_to_line1: string | null;
  ship_to_line2: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_postal: string | null;
  ship_to_country: string | null;
  provider_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface OrdersManagerProps {
  onSelectOrder?: (orderId: string) => void;
}

export const OrdersManager = ({ onSelectOrder }: OrdersManagerProps = {}) => {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-admin-orders', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOrders(data?.orders || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch =
      order.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: StoreOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'paid':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'refunded':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1" />Refunded</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewOrder = (orderId: string) => {
    if (onSelectOrder) {
      onSelectOrder(orderId);
    } else {
      setDrawerOrderId(orderId);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Refunded</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'refunded').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or order id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.buyer_email}</TableCell>
                  <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{formatMoney(order.amount_cents, order.currency)}</TableCell>
                  <TableCell>
                    {order.requires_shipping ? (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Truck className="w-3.5 h-3.5" /> Ships to {order.ship_to_city || '—'}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Digital</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewOrder(order.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No orders found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Only render our own drawer instance when the parent isn't already
          managing one (ProductManagement.tsx owns its own OrderDetailDrawer
          + selectedOrderId state) — avoids mounting two drawers for the
          same order. */}
      {!onSelectOrder && (
        <OrderDetailDrawer
          orderId={drawerOrderId}
          isOpen={!!drawerOrderId}
          onClose={() => setDrawerOrderId(null)}
          onRefunded={fetchOrders}
        />
      )}
    </div>
  );
};
