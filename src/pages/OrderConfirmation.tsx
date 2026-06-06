import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Mail, ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface OrderItem {
  product_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  customer_email: string;
  customer_name: string;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  shipping_address: any;
  items: OrderItem[];
  created_at: string;
}

export const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderNumber = searchParams.get('order');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId || orderNumber) {
      verifyOrder();
    } else {
      setLoading(false);
      setError("No order information provided");
    }
  }, [sessionId, orderNumber]);

  const verifyOrder = async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('verify-shop-payment', {
        body: { 
          session_id: sessionId,
          order_number: orderNumber 
        }
      });

      if (fetchError) throw fetchError;
      if (data.error) throw new Error(data.error);

      setOrder(data.order);
    } catch (err: any) {
      console.error('Error verifying order:', err);
      setError(err.message || "Failed to verify order");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-stone-400 mx-auto mb-4" />
            <p className="text-stone-600">Confirming your order...</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  if (error || !order) {
    return (
      <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
          <div className="w-full py-4 sm:py-5 flex items-center justify-center" style={{ backgroundColor: '#150d26' }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Order Status</h1>
          </div>
          <div className="container mx-auto px-4 py-12">
            <Card className="max-w-lg mx-auto">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-muted-foreground mb-6">{error || "We couldn't find your order."}</p>
                <Button asChild>
                  <Link to="/shop">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to Shop
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  const isPaid = order.payment_status === 'paid';

  return (
    <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
        {/* Header */}
        <div className="w-full py-4 sm:py-5 flex items-center justify-center" style={{ backgroundColor: '#150d26' }}>
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3">
              {isPaid ? (
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              ) : (
                <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {isPaid ? "Order Confirmed!" : "Order Status"}
              </h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Success Message */}
            {isPaid && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-green-800 mb-1">Thank you for your order!</h2>
                      <p className="text-green-700 text-sm">
                        A confirmation email has been sent to <strong>{order.customer_email}</strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Details
                  </CardTitle>
                  <Badge variant={isPaid ? "default" : "outline"} className={isPaid ? "bg-green-500" : ""}>
                    {isPaid ? "Paid" : order.payment_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order Number</p>
                    <p className="font-mono font-medium">{order.order_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Items Ordered</h3>
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.product_title} <span className="text-muted-foreground">× {item.quantity}</span>
                        </span>
                        <span className="font-medium">${item.total_price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${order.subtotal?.toFixed(2)}</span>
                  </div>
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${order.shipping_cost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${order.total_amount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shipping_address && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Shipping To</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>{order.shipping_address.name}</p>
                      <p>{order.shipping_address.street1}</p>
                      {order.shipping_address.street2 && <p>{order.shipping_address.street2}</p>}
                      <p>
                        {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline">
                <Link to="/shop">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Continue Shopping
                </Link>
              </Button>
              <Button asChild>
                <a href={`mailto:shop@gleeworld.org?subject=Order ${order.order_number}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default OrderConfirmation;
