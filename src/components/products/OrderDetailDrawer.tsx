import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, CreditCard, Truck, MapPin, Calendar,
  ExternalLink, RefreshCw, Download, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderDetailDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Match actual gw_orders schema
interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  currency: string;
  shipping_address: any;
  billing_address: any;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
  requires_shipping: boolean;
  easypost_tracking_code: string | null;
  easypost_label_url: string | null;
  stripe_payment_intent_id: string | null;
}

// Match actual gw_order_items schema
interface OrderItem {
  id: string;
  product_title: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  requires_shipping: boolean;
  product_image: string | null;
}

interface Shipment {
  id: string;
  carrier: string | null;
  service: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  label_url: string | null;
  status: string;
  cost: number | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

interface Payment {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  status: string;
  amount: number;
  currency: string;
  receipt_url: string | null;
  created_at: string;
}

export const OrderDetailDrawer = ({ orderId, isOpen, onClose }: OrderDetailDrawerProps) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
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
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('gw_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      // Map to our interface
      setOrder({
        id: orderData.id,
        order_number: orderData.order_number,
        status: orderData.status,
        payment_status: orderData.payment_status,
        total_amount: orderData.total_amount || 0,
        subtotal: orderData.subtotal || 0,
        shipping_cost: orderData.shipping_cost || 0,
        tax_amount: orderData.tax_amount || 0,
        discount_amount: orderData.discount_amount || 0,
        currency: orderData.currency || 'USD',
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        customer_name: orderData.customer_name || '',
        customer_email: orderData.customer_email || '',
        requires_shipping: orderData.requires_shipping || false,
        easypost_tracking_code: orderData.easypost_tracking_code,
        easypost_label_url: orderData.easypost_label_url,
        stripe_payment_intent_id: orderData.stripe_payment_intent_id,
      });

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('gw_order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      
      // Map items to our interface
      setItems((itemsData || []).map(item => ({
        id: item.id,
        product_title: item.product_title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        requires_shipping: item.requires_shipping,
        product_image: item.product_image,
      })));

      // Fetch shipments
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('gw_shipments')
        .select('*')
        .eq('order_id', orderId);

      if (!shipmentsError) {
        setShipments(shipmentsData || []);
      }

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('gw_payments')
        .select('*')
        .eq('order_id', orderId);

      if (!paymentsError) {
        setPayments(paymentsData || []);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, type: 'order' | 'payment' | 'fulfillment') => {
    const configs: Record<string, Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }>> = {
      order: {
        pending: { variant: 'secondary', label: 'Pending' },
        paid: { variant: 'default', label: 'Paid' },
        fulfilled: { variant: 'default', label: 'Fulfilled' },
        shipped: { variant: 'default', label: 'Shipped' },
        canceled: { variant: 'destructive', label: 'Canceled' },
        cancelled: { variant: 'destructive', label: 'Cancelled' },
        refunded: { variant: 'outline', label: 'Refunded' },
        delivered: { variant: 'default', label: 'Delivered' },
      },
      payment: {
        unpaid: { variant: 'secondary', label: 'Unpaid' },
        pending: { variant: 'secondary', label: 'Pending' },
        processing: { variant: 'secondary', label: 'Processing' },
        paid: { variant: 'default', label: 'Paid' },
        succeeded: { variant: 'default', label: 'Succeeded' },
        refunded: { variant: 'outline', label: 'Refunded' },
        disputed: { variant: 'destructive', label: 'Disputed' },
        failed: { variant: 'destructive', label: 'Failed' },
      },
      fulfillment: {
        unfulfilled: { variant: 'secondary', label: 'Unfulfilled' },
        partial: { variant: 'outline', label: 'Partial' },
        fulfilled: { variant: 'default', label: 'Fulfilled' },
      },
    };
    const config = configs[type]?.[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatAddress = (address: any) => {
    if (!address) return <span className="text-muted-foreground">No address provided</span>;
    return (
      <div className="text-sm">
        {address.name && <p className="font-medium">{address.name}</p>}
        {address.street1 && <p>{address.street1}</p>}
        {address.street2 && <p>{address.street2}</p>}
        {address.line1 && <p>{address.line1}</p>}
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}{address.state ? `, ${address.state}` : ''} {address.zip || address.postal_code}
        </p>
        {address.country && <p>{address.country}</p>}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Order {order?.order_number || '...'}</span>
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
                {getStatusBadge(order.status, 'order')}
                {getStatusBadge(order.payment_status, 'payment')}
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
                    <span className="text-muted-foreground">Customer</span>
                    <span>{order.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{order.customer_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</span>
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
                      <div className="flex gap-3">
                        {item.product_image && (
                          <img 
                            src={item.product_image} 
                            alt={item.product_title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{item.product_title}</p>
                          {item.variant_title && (
                            <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Qty: {item.quantity}
                            </Badge>
                            {!item.requires_shipping && (
                              <Badge variant="secondary" className="text-xs">Digital</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.total_price, order.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit_price, order.currency)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(order.subtotal, order.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatCurrency(order.shipping_cost, order.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(order.tax_amount, order.currency)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(order.discount_amount, order.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(order.total_amount, order.currency)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formatAddress(order.shipping_address)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formatAddress(order.billing_address)}
                  </CardContent>
                </Card>
              </div>

              {/* Payment Info from Order */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.stripe_payment_intent_id ? (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stripe Payment Intent</span>
                        <span className="font-mono text-xs">{order.stripe_payment_intent_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(order.payment_status, 'payment')}
                      </div>
                    </div>
                  ) : payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {payment.stripe_payment_intent_id || payment.stripe_charge_id || 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(payment.status, 'payment')}
                            {payment.receipt_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payment recorded</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Issue Refund
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Shipments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.easypost_tracking_code ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tracking</span>
                        <span className="font-mono">{order.easypost_tracking_code}</span>
                      </div>
                      {order.easypost_label_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={order.easypost_label_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-1" />
                            Download Label
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : shipments.length > 0 ? (
                    <div className="space-y-3">
                      {shipments.map((shipment) => (
                        <div key={shipment.id} className="py-2 border-b last:border-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {shipment.carrier} - {shipment.service}
                              </p>
                              {shipment.tracking_code && (
                                <p className="text-xs font-mono text-muted-foreground">
                                  {shipment.tracking_code}
                                </p>
                              )}
                              {shipment.cost && (
                                <p className="text-xs text-muted-foreground">
                                  Cost: {formatCurrency(shipment.cost)}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{shipment.status}</Badge>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {shipment.tracking_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Track
                                </a>
                              </Button>
                            )}
                            {shipment.label_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={shipment.label_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4 mr-1" />
                                  Label
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : order.requires_shipping ? (
                    <p className="text-sm text-muted-foreground">No shipment created yet</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Digital order - no shipping required</p>
                  )}
                  {order.requires_shipping && !order.easypost_tracking_code && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" disabled>
                        Create Shipment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Order not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
