import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Truck, 
  Lock, 
  ArrowLeft, 
  Mail, 
  User,
  MapPin,
  Package
} from "lucide-react";

interface CartItem {
  product: {
    id: string;
    title: string;
    price: number;
    requires_shipping: boolean;
    weight?: number;
    images: string[];
  };
  quantity: number;
}

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  description: string;
}

interface CheckoutForm {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  sameAsBilling: boolean;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
}

export const CheckoutPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingCost, setShippingCost] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const [form, setForm] = useState<CheckoutForm>({
    email: user?.email || "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    sameAsBilling: true,
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingState: "",
    shippingPostalCode: "",
    shippingCountry: "US"
  });

  useEffect(() => {
    // Get cart data from navigation state
    const state = location.state as { cartItems: CartItem[], totalAmount: number };
    if (!state?.cartItems || state.cartItems.length === 0) {
      navigate('/shop');
      return;
    }
    
    setCartItems(state.cartItems);
    setSubtotal(state.totalAmount);
    calculateShipping(state.cartItems, state.totalAmount);
  }, [location.state, navigate]);

  const calculateShipping = async (items: CartItem[], subtotalAmount: number) => {
    try {
      setLoading(true);
      
      const shippingItems = items.map(item => ({
        weight: item.product.weight || 0.5,
        requiresShipping: item.product.requires_shipping,
        quantity: item.quantity
      }));

      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: {
          items: shippingItems,
          destination: {
            country: form.country,
            state: form.state,
            postalCode: form.postalCode
          },
          subtotal: subtotalAmount
        }
      });

      if (error) throw error;
      
      setShippingOptions(data.shippingOptions || []);
      if (data.shippingOptions?.length > 0) {
        setSelectedShipping(data.shippingOptions[0].id);
        setShippingCost(data.shippingOptions[0].price);
      }
    } catch (error) {
      console.error('Error calculating shipping:', error);
      toast({
        title: "Shipping Error",
        description: "Unable to calculate shipping rates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Calculate tax (8.75% for Atlanta, GA)
    const taxRate = form.state === 'GA' ? 0.0875 : 0.08;
    const taxAmount = subtotal * taxRate;
    setTax(taxAmount);
    setTotal(subtotal + shippingCost + taxAmount);
  }, [subtotal, shippingCost, form.state]);

  const handleShippingChange = (shippingId: string) => {
    const option = shippingOptions.find(opt => opt.id === shippingId);
    if (option) {
      setSelectedShipping(shippingId);
      setShippingCost(option.price);
    }
  };

  const createOrder = async () => {
    try {
      const orderNumber = `GW-${Date.now()}`;
      
      const { data: order, error: orderError } = await supabase
        .from('gw_user_orders')
        .insert({
          user_id: user?.id || null,
          guest_email: user ? null : form.email,
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending',
          total_amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          shipping_amount: shippingCost,
          currency: 'USD',
          billing_address: {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.address1,
            address_line_2: form.address2,
            city: form.city,
            state: form.state,
            postal_code: form.postalCode,
            country: form.country
          },
          shipping_address: form.sameAsBilling ? {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.address1,
            address_line_2: form.address2,
            city: form.city,
            state: form.state,
            postal_code: form.postalCode,
            country: form.country
          } : {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.shippingAddress1,
            address_line_2: form.shippingAddress2,
            city: form.shippingCity,
            state: form.shippingState,
            postal_code: form.shippingPostalCode,
            country: form.shippingCountry
          }
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        product_title: item.product.title
      }));

      const { error: itemsError } = await supabase
        .from('gw_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!validateForm()) return;
    
    setProcessingPayment(true);
    
    try {
      // Create order first
      const order = await createOrder();
      
      // For demo purposes, simulate Square payment
      // In a real implementation, you would integrate with Square's Web Payments SDK
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process payment through Square edge function
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-square-payment', {
        body: {
          sourceId: 'demo-card-token', // This would come from Square's Web Payments SDK
          amount: total,
          currency: 'USD',
          orderId: order.id,
          userId: user?.id,
          guestEmail: user ? undefined : form.email,
          billingAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.address1,
            address_line_2: form.address2,
            city: form.city,
            state: form.state,
            postal_code: form.postalCode,
            country: form.country
          },
          shippingAddress: form.sameAsBilling ? {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.address1,
            address_line_2: form.address2,
            city: form.city,
            state: form.state,
            postal_code: form.postalCode,
            country: form.country
          } : {
            firstName: form.firstName,
            lastName: form.lastName,
            address_line_1: form.shippingAddress1,
            address_line_2: form.shippingAddress2,
            city: form.shippingCity,
            state: form.shippingState,
            postal_code: form.shippingPostalCode,
            country: form.shippingCountry
          }
        }
      });

      if (paymentError) throw paymentError;

      // Clear cart and redirect to success page
      localStorage.removeItem('gleeworld-cart');
      toast({
        title: "Payment Successful!",
        description: `Order ${order.order_number} has been placed successfully.`
      });
      
      navigate('/order-confirmation', { 
        state: { orderId: order.id, orderNumber: order.order_number }
      });

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const validateForm = () => {
    if (!form.email || !form.firstName || !form.lastName || !form.address1 || !form.city || !form.state || !form.postalCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return false;
    }
    
    if (!selectedShipping && shippingOptions.length > 0) {
      toast({
        title: "Shipping Required",
        description: "Please select a shipping option.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/shop')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Forms */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={!!user}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address1">Address Line 1</Label>
                  <Input
                    id="address1"
                    value={form.address1}
                    onChange={(e) => setForm({ ...form, address1: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address2"
                    value={form.address2}
                    onChange={(e) => setForm({ ...form, address2: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select value={form.state} onValueChange={(value) => setForm({ ...form, state: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={form.country} onValueChange={(value) => setForm({ ...form, country: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Options */}
            {shippingOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p>Calculating shipping rates...</p>
                  ) : (
                    <div className="space-y-3">
                      {shippingOptions.map((option) => (
                        <div
                          key={option.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedShipping === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                          onClick={() => handleShippingChange(option.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{option.name}</div>
                              <div className="text-sm text-gray-600">{option.description}</div>
                              <div className="text-sm text-gray-500">
                                Estimated delivery: {option.estimatedDays} business days
                              </div>
                            </div>
                            <div className="font-bold">
                              {option.price === 0 ? 'FREE' : `$${option.price.toFixed(2)}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'} 
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.product.title}</div>
                        <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                        <div className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Order Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePayment}
                  disabled={processingPayment || loading}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {processingPayment ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                </Button>
                
                <div className="text-xs text-gray-500 text-center">
                  Your payment information is secure and encrypted
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};