import React, { useState, useEffect } from 'react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package, CreditCard, Truck, MapPin, Calendar,
  RefreshCw, Loader2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderDetailDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  // Optional: lets a parent-owned orders list (e.g. OrdersManager) refresh
  // itself after a refund changes this order's status.
  onRefunded?: () => void;
}

// Commerce Core order — see OrdersManager.tsx for why this reads through
// the store-admin-orders edge function instead of supabase-js directly
// (gw_store_orders has no permissive RLS policy for `authenticated`).
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

interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  unit_price_cents: number;
  quantity: number;
  is_digital: boolean;
  gw_products?: { name: string } | null;
}

export const OrderDetailDrawer = ({ orderId, isOpen, onClose, onRefunded }: OrderDetailDrawerProps) => {
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetails();
    }
  }, [orderId, isOpen]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-admin-orders', {
        body: { order_id: orderId, tenant_slug: getTenantSlug() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOrder(data.order);
      setItems(data.items || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!order) return;

    setProcessingRefund(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-refund', {
        body: { order_id: order.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Refund Issued",
        description: `${formatCurrency(order.amount_cents, order.currency)} refunded successfully`,
      });

      setRefundDialogOpen(false);
      await fetchOrderDetails();
      onRefunded?.();
    } catch (error: any) {
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setProcessingRefund(false);
    }
  };

  const getStatusBadge = (status: StoreOrder['status']) => {
    const config: Record<StoreOrder['status'], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      paid: { variant: 'default', label: 'Paid' },
      refunded: { variant: 'secondary', label: 'Refunded' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (cents: number, currency: string = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);

  const formatAddress = (o: StoreOrder) => {
    if (!o.ship_to_line1 && !o.ship_to_city) {
      return <span className="text-muted-foreground">No shipping address on file</span>;
    }
    return (
      <div className="text-sm">
        {o.ship_to_name && <p className="font-medium">{o.ship_to_name}</p>}
        {o.ship_to_line1 && <p>{o.ship_to_line1}</p>}
        {o.ship_to_line2 && <p>{o.ship_to_line2}</p>}
        <p>
          {o.ship_to_city}{o.ship_to_state ? `, ${o.ship_to_state}` : ''} {o.ship_to_postal}
        </p>
        {o.ship_to_country && <p>{o.ship_to_country}</p>}
      </div>
    );
  };

  const canRefund = order && order.status === 'paid';

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center justify-between">
              <span className="font-mono text-base">Order {order?.id.slice(0, 8) || '...'}</span>
              <Button variant="outline" size="sm" onClick={fetchOrderDetails} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : order ? (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 pb-6">
                {/* Status Summary */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(order.status)}
                  <Badge variant="outline">{order.store_type === 'gleeworld' ? 'GleeWorld Store' : 'Tenant Store'}</Badge>
                </div>

                {/* Order Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer</span>
                      <span>{order.buyer_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last updated</span>
                      <span>{format(new Date(order.updated_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Items ({items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items</p>
                    ) : items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{item.gw_products?.name || 'Product'}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Qty: {item.quantity}
                            </Badge>
                            {item.is_digital && (
                              <Badge variant="secondary" className="text-xs">Digital</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(item.unit_price_cents * item.quantity, order.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unit_price_cents, order.currency)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Total */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(order.amount_cents, order.currency)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address (physical orders only) */}
                {order.requires_shipping && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formatAddress(order)}
                    </CardContent>
                  </Card>
                )}

                {/* Payment Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stripe Payment Intent</span>
                        <span className="font-mono text-xs">{order.provider_payment_intent_id || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRefundDialogOpen(true)}
                        disabled={!canRefund || processingRefund}
                      >
                        {processingRefund && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Refund
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {order.requires_shipping && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Fulfillment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Shipping labels aren't wired up for the storefront yet — ship this order manually
                        using the address above.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Order not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Refund this order?
            </DialogTitle>
            <DialogDescription>
              This refunds the full order total via Stripe and restocks any managed inventory.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-lg font-bold">
              {order && formatCurrency(order.amount_cents, order.currency)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleIssueRefund}
              disabled={processingRefund}
            >
              {processingRefund && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
