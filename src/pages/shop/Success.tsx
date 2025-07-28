import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  ShoppingBag, 
  Mail,
  Package,
  ArrowRight
} from "lucide-react";

export const Success = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setError("No session ID found");
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-stripe-payment', {
        body: { sessionId }
      });

      if (error) throw error;

      if (data.success) {
        setPaymentData(data);
        // Clear cart from localStorage
        localStorage.removeItem('gleeworld-cart');
      } else {
        setError("Payment not completed");
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError(error.message || "Failed to verify payment");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your payment...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <ShoppingBag className="h-16 w-16 mx-auto" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button asChild>
                <Link to="/shop">Return to Shop</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-green-500 mb-6">
              <CheckCircle className="h-20 w-20 mx-auto" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-8">
              Thank you for your purchase. Your order has been confirmed.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600">Order Total</p>
                  <p className="font-bold text-xl">${paymentData?.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{paymentData?.customer_email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Mail className="h-5 w-5" />
                <span className="text-sm">Order confirmation sent to your email</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Package className="h-5 w-5" />
                <span className="text-sm">Your order will be processed within 1-2 business days</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/shop">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Return Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};